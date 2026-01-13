// js/script.js
import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Probabilidades de las cajas
const probabilidades = {
  cuba: { comun: 85, rara: 12, epica: 2.5, legendaria: 0.5 },
  gods: { comun: 80, rara: 13, epica: 5, legendaria: 2 },
  ugreen: { comun: 75, rara: 15, epica: 7, legendaria: 3 },
  lady: { comun: 70, rara: 18, epica: 8, legendaria: 4 },
  pago1: { comun: 20, rara: 35, epica: 30, legendaria: 15 },
  pago2: { comun: 20, rara: 35, epica: 30, legendaria: 15 },
  pago3: { comun: 20, rara: 35, epica: 30, legendaria: 15 },
  pago4: { comun: 20, rara: 35, epica: 30, legendaria: 15 },
};

// Valores de skins
const valores = {
  comun: 0.10,
  rara: 0.50,
  epica: 2,
  legendaria: 10
};

// Imágenes de skins
const imagenes = {
  comun: "./img/skin1.png",
  rara: "./img/skin2.png",
  epica: "./img/skin3.png",
  legendaria: "./img/skin4.png"
};

// Elementos del DOM
const cajas = document.querySelectorAll(".box");
const saldoBtn = document.querySelector(".saldo");
const popup = document.getElementById("popupRuleta");
const ruletaBar = document.getElementById("ruletaBar");
const ruletaContainer = document.getElementById("ruletaContainer");
const btnGirar = document.getElementById("btnGirar");
const closeRuleta = document.getElementById("closeRuleta");

let tipoCajaActual = null;
let skinGanada = null;

// Variables para controlar cobro de caja de pago en esta apertura
let openingPaid = false;          // si ya se descontaron los 2€ para la apertura actual
let openingUserUid = null;        // uid del usuario que abrió la ruleta (por seguridad)

// Generar ruleta con skins
function generarRuleta() {
  if (!ruletaBar) return;
  ruletaBar.innerHTML = "";
  const skins = ["comun", "rara", "epica", "legendaria"];
  // Repetimos varias veces para dar sensación de rueda larga
  for (let i = 0; i < 20; i++) {
    skins.forEach(skin => {
      const div = document.createElement("div");
      div.className = "item";
      div.dataset.tipo = skin;

      const img = document.createElement("img");
      img.src = imagenes[skin];
      img.style.width = "60px";

      div.appendChild(img);
      ruletaBar.appendChild(div);
    });
  }
}
generarRuleta();

// Función para actualizar el saldo en el DOM (consulta puntual)
async function actualizarSaldo() {
  try {
    const user = auth.currentUser;
    if (!user || !saldoBtn) return;
    const snap = await getDoc(doc(db, "users", user.uid));
    const saldo = snap.exists() ? (snap.data().saldo || 0) : 0;
    saldoBtn.innerHTML = `<span class="dolar">$</span>${saldo.toFixed(2)}`;
  } catch (err) {
    console.error("Error actualizando saldo:", err);
  }
}

// Evento click en las cajas
cajas.forEach(caja => {
  caja.addEventListener("click", async () => {
    tipoCajaActual = caja.dataset.caja;
    const user = auth.currentUser;

    if (!user) {
      alert("Debes iniciar sesión primero.");
      return;
    }

    openingPaid = false;
    openingUserUid = user.uid;

    // Si la caja es de pago, cobramos 2€ mediante una transacción atómica
    if (tipoCajaActual && tipoCajaActual.startsWith("pago")) {
      const userRef = doc(db, "users", user.uid);
      try {
        await runTransaction(db, async (transaction) => {
          const sf = await transaction.get(userRef);
          if (!sf.exists()) throw new Error("Usuario no encontrado en la base de datos.");
          const saldoActual = sf.data().saldo ?? 0;
          if (saldoActual < 2) {
            // lanzamos error para que el runTransaction falle y podamos mostrar mensaje
            throw new Error(`No tienes suficiente dinero para abrir esta caja.\nTu saldo actual es: ${saldoActual.toFixed(2)} €`);
          }
          transaction.update(userRef, { saldo: +(saldoActual - 2).toFixed(2) });
        });
        openingPaid = true; // ya cobramos los 2€
      } catch (err) {
        console.error("Error cobrando caja de pago:", err);
        alert(err.message || "Error procesando el pago.");
        return;
      }
    }

    // Mostrar popup de ruleta
    if (popup) popup.style.display = "flex";
  });
});

// Cerrar popup de ruleta
if (closeRuleta) {
  closeRuleta.onclick = () => {
    // no hacemos devolución automática si ya se cobró (comportamiento definido)
    if (popup) popup.style.display = "none";
  };
}

// Girar ruleta
if (btnGirar) {
  btnGirar.onclick = () => {
    if (!tipoCajaActual) {
      alert("Error: tipo de caja no definido.");
      return;
    }
    const prob = probabilidades[tipoCajaActual];
    if (!prob) {
      alert("Probabilidades no configuradas para esta caja.");
      return;
    }

    const rand = Math.random() * 100;

    if (rand < prob.comun) skinGanada = "comun";
    else if (rand < prob.comun + prob.rara) skinGanada = "rara";
    else if (rand < prob.comun + prob.rara + prob.epica) skinGanada = "epica";
    else skinGanada = "legendaria";

    const items = [...ruletaBar.children];
    // buscamos el último índice del tipo seleccionado (para que la ruleta "pare" en uno)
    const index = items.map(i => i.dataset.tipo).lastIndexOf(skinGanada);
    const itemWidth = 120; // aprox (min-width 100 + margin)
    const desplazamiento = -(index * itemWidth - ruletaContainer.offsetWidth / 2);

    ruletaBar.style.transition = "transform 4s cubic-bezier(.17,.67,.32,1)";
    ruletaBar.style.transform = `translateX(${desplazamiento}px)`;

    setTimeout(() => {
      if (popup) popup.style.display = "none";
      ruletaBar.style.transition = "none";
      ruletaBar.style.transform = "translateX(0)";
      mostrarResultado();
    }, 4500);
  };
}

// Mostrar resultado y permitir vender
function mostrarResultado() {
  const valor = valores[skinGanada] ?? 0;

  const modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100%";
  modal.style.height = "100%";
  modal.style.background = "rgba(0,0,0,0.7)";
  modal.style.display = "flex";
  modal.style.justifyContent = "center";
  modal.style.alignItems = "center";
  modal.style.zIndex = "3000";

  const caja = document.createElement("div");
  caja.style.background = "white";
  caja.style.padding = "30px";
  caja.style.borderRadius = "15px";
  caja.style.textAlign = "center";

  const texto = document.createElement("h2");
  texto.textContent = `Has conseguido una skin ${skinGanada.toUpperCase()}!`;

  const img = document.createElement("img");
  img.src = imagenes[skinGanada];
  img.style.width = "120px";
  img.style.margin = "15px 0";

  const btnVender = document.createElement("button");
  btnVender.type = "button";
  btnVender.textContent = `Vender por ${valor.toFixed(2)} €`;
  btnVender.style.padding = "10px 25px";
  btnVender.style.border = "none";
  btnVender.style.borderRadius = "10px";
  btnVender.style.background = "linear-gradient(135deg,#007bff,#ff4db8)";
  btnVender.style.color = "white";
  btnVender.style.fontWeight = "bold";
  btnVender.style.cursor = "pointer";

  btnVender.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    modal.remove(); // Cerramos modal

    const user = auth.currentUser;
    if (!user) {
      alert("Sesión perdida, vuelve a iniciar sesión.");
      return;
    }

    const ref = doc(db, "users", user.uid);
    try {
      // Incrementamos saldo de forma segura con transacción
      await runTransaction(db, async (transaction) => {
        const sf = await transaction.get(ref);
        if (!sf.exists()) throw new Error("Usuario no encontrado.");
        let saldo = sf.data().saldo ?? 0;

        // Nota: si la apertura fue de pago ya descontamos los 2€ al abrir (openingPaid === true).
        // Si por alguna razón openingPaid está a false y la caja es de pago, intentamos descontar ahora:
        if (tipoCajaActual && tipoCajaActual.startsWith("pago") && !openingPaid) {
          if (saldo < 2) throw new Error("Saldo insuficiente al intentar cobrar la caja.");
          saldo = +(saldo - 2).toFixed(2);
        }

        // Sumamos el valor de la skin
        saldo = +(saldo + valor).toFixed(2);
        transaction.update(ref, { saldo });
      });

      // Actualizamos en DOM (aunque auth.js ya tiene onSnapshot que actualizará)
      await actualizarSaldo();
      alert(`Skin vendida por ${valor.toFixed(2)} €. Saldo actualizado.`);
    } catch (err) {
      console.error("Error al vender y actualizar saldo:", err);
      alert(err.message || "Error al procesar la venta.");
    } finally {
      // reset apertura
      openingPaid = false;
      openingUserUid = null;
    }
  };

  caja.appendChild(texto);
  caja.appendChild(img);
  caja.appendChild(btnVender);
  modal.appendChild(caja);
  document.body.appendChild(modal);
}
