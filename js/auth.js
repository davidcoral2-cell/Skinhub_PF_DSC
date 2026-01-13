// js/auth.js
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

/**
 * Este módulo:
 * - Muestra el email en el botón de login si el usuario está logueado.
 * - Permite cerrar sesión desde ese botón.
 * - Mantiene el botón de saldo actualizado en tiempo real usando onSnapshot.
 *
 * Está escrito para no romper si algún elemento no existe (p. ej. en páginas de login).
 */

const btnLogin = document.getElementById("btnLogin");   // puede ser null en algunas páginas
const saldoBtn = document.querySelector(".saldo");      // puede ser null en algunas páginas

let unsubscribeSaldo = null;

onAuthStateChanged(auth, (user) => {
  // Botón de login / logout
  if (btnLogin) {
    if (user) {
      // Mostrar email (si es muy largo, te lo dejamos entero para fines de proyecto)
      btnLogin.textContent = user.email || "Usuario";
      btnLogin.onclick = async () => {
        if (confirm("¿Cerrar sesión?")) {
          try {
            await signOut(auth);
          } catch (err) {
            console.error("Error cerrando sesión:", err);
            alert("Error al cerrar sesión. Revisa la consola.");
          }
        }
      };
    } else {
      btnLogin.textContent = "Iniciar sesión";
      btnLogin.onclick = () => {
        // redirige a la página de login (ruta relativa desde index.html)
        window.location.href = "./views/login.html";
      };
    }
  }

  // Botón de saldo: escuchamos cambios en tiempo real en la doc del usuario
  if (saldoBtn) {
    // cancelar escucha anterior
    if (typeof unsubscribeSaldo === "function") {
      unsubscribeSaldo();
      unsubscribeSaldo = null;
    }

    if (user) {
      const ref = doc(db, "users", user.uid);
      unsubscribeSaldo = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          const saldo = snap.data().saldo ?? 0;
          saldoBtn.innerHTML = `<span class="dolar">$</span>${saldo.toFixed(2)}`;
        } else {
          saldoBtn.innerHTML = `<span class="dolar">$</span>0.00`;
        }
      }, (err) => {
        console.error("Error en snapshot de saldo:", err);
        saldoBtn.innerHTML = `<span class="dolar">$</span>0.00`;
      });
    } else {
      // no hay usuario -> 0.00
      saldoBtn.innerHTML = `<span class="dolar">$</span>0.00`;
    }
  }
});
