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
  pago2: { comun: 18, rara: 35, epica: 30, legendaria: 17 },
  pago3: { comun: 15, rara: 35, epica: 33, legendaria: 17 },
  pago4: { comun: 10, rara: 37, epica: 33, legendaria: 20 },
};

// Valores de skins por tipo e índice
const valores = {
  comun: [0.07, 0.09, 0.03, 0.11, 0.12],
  rara: [0.33, 0.47, 0.52, 0.61, 0.62],
  epica: [1.85, 1.94, 2.03, 2.10, 2.21],
  legendaria: [13.97, 14.71, 15.66, 18.95, 21.13]
};

// Función para calcular probabilidades individuales por skin basadas en precio
function calcularProbabilidadesSkins(probTipos) {
  const probSkins = {};
  const tipos = ["comun", "rara", "epica", "legendaria"];
  
  tipos.forEach(tipo => {
    const skinsTipo = skins[tipo];
    const probTipo = probTipos[tipo];
    
    // Calcular suma total de precios
    const sumaPreciosNormalizado = skinsTipo.reduce((a, b) => a + b.valor, 0);
    
    // Distribuir probabilidad según precio relativo
    probSkins[tipo] = skinsTipo.map(skin => {
      return (probTipo / 100) * (skin.valor / sumaPreciosNormalizado) * 100;
    });
  });
  
  return probSkins;
}

// Imagenes de skins por tipo (5 cada tipo) - Variables individuales
const skins = {
  comun: [
    { id: "comun1", src: "./img/comun1.png", valor: 0.07, nombre: "MAC-10 | Sakkaku" },
    { id: "comun2", src: "./img/comun2.png", valor: 0.09, nombre: "Sticker | Peek-a-Boo" },
    { id: "comun3", src: "./img/comun3.png", valor: 0.03, nombre: "M4A1-S | Welcome to the Jungle" },
    { id: "comun4", src: "./img/comun4.png", valor: 0.11, nombre: "Zeus x27 | Olympus" },
    { id: "comun5", src: "./img/comun5.png", valor: 0.12, nombre: "MP9 | Buff Blue" }
  ],
  rara: [
    { id: "rara1", src: "./img/rara1.png", valor: 0.33, nombre: "AK-47 | Neon Rider" },
    { id: "rara2", src: "./img/rara2.png", valor: 0.47, nombre: "AWP | Pit Viper" },
    { id: "rara3", src: "./img/rara3.png", valor: 0.52, nombre: "AK-47 | Ice Coaled" },
    { id: "rara4", src: "./img/rara4.png", valor: 0.61, nombre: "M4A1-S | Vaporwave" },
    { id: "rara5", src: "./img/rara5.png", valor: 0.62, nombre: "Glock-18 | Shinobu" }
  ],
  epica: [
    { id: "epica1", src: "./img/epica1.png", valor: 1.85, nombre: "Deser Eagle | Printstream" },
    { id: "epica2", src: "./img/epica2.png", valor: 1.94, nombre: "AK-47 | Asiimov" },
    { id: "epica3", src: "./img/epica3.png", valor: 2.03, nombre: "Deser Eagle | Tilted" },
    { id: "epica4", src: "./img/epica4.png", valor: 2.10, nombre: "USP-S | The Traitor" },
    { id: "epica5", src: "./img/epica5.png", valor: 2.21, nombre: "Shadow Daggers | Lore" }
  ],
  legendaria: [
    { id: "legendaria1", src: "./img/legendaria1.png", valor: 13.97, nombre: "M4A4 | Howl" },
    { id: "legendaria2", src: "./img/legendaria2.png", valor: 14.71, nombre: "AWP | Dragon Lore" },
    { id: "legendaria3", src: "./img/legendaria3.png", valor: 15.66, nombre: "Karambit | Gamma Doppler Emerald" },
    { id: "legendaria4", src: "./img/legendaria4.png", valor: 18.95, nombre: "Butterfly Knife | Doppler Ruby" },
    { id: "legendaria5", src: "./img/legendaria5.png", valor: 21.13, nombre: "AK-47 | Wild Lotus" }
  ]
};

// Precios de cajas de pago
const preciosPago = {
  pago1: 2.30,
  pago2: 2.93,
  pago3: 3.28,
  pago4: 4.13
};

// Elementos de la web
const cajas = document.querySelectorAll(".box");
const saldoBtn = document.querySelector(".saldo");
const popup = document.getElementById("popupRuleta");
const ruletaBar = document.getElementById("ruletaBar");
const ruletaContainer = document.getElementById("ruletaContainer");
const btnGirar = document.getElementById("btnGirar");
const closeRuleta = document.getElementById("closeRuleta");
const userNombreElem = document.getElementById("userNombre"); // elemento donde mostrar el nombre

let tipoCajaActual = null;
let skinGanada = null;
let skinSeleccionadaObj = null;
let openingPaid = false;          
let openingUserUid = null;        

// Generar ruleta con skins aleatorias y agregar la skin ganadora al final
function generarRuletaConGanadora(skinGanadora) {
  if (!ruletaBar) return;
  ruletaBar.innerHTML = "";
  const tipos = ["comun", "rara", "epica", "legendaria"];
  
  // Generar items aleatorios ANTES de la ganadora
  for (let i = 0; i < 20; i++) {
    tipos.forEach(tipo => {
      const div = document.createElement("div");
      div.className = "item";
      div.dataset.tipo = tipo;

      const skinsTipo = skins[tipo];
      const skinSeleccionada = skinsTipo[Math.floor(Math.random() * skinsTipo.length)];
      asignarClaseRareza(div, tipo, skinSeleccionada.id);
      
      const img = document.createElement("img");
      img.src = skinSeleccionada.src;
      img.style.width = "140px";
      img.style.height = "140px";
      img.style.objectFit = "contain";
      img.dataset.skinId = skinSeleccionada.id;

      div.appendChild(img);
      ruletaBar.appendChild(div);
    });
  }
  
  // Agregar la skin ganadora 
  const divGanadora = document.createElement("div");
  divGanadora.className = "item";
  const tipoGanadora = skinGanadora.id.replace(/[0-9]/g, ''); // Extraer tipo de rara3 -> rara
  divGanadora.dataset.tipo = tipoGanadora;
  divGanadora.dataset.ganadora = "true"; // Marcar como ganadora
  asignarClaseRareza(divGanadora, tipoGanadora, skinGanadora.id);
  
  const imgGanadora = document.createElement("img");
  imgGanadora.src = skinGanadora.src;
  imgGanadora.style.width = "140px";
  imgGanadora.style.height = "140px";
  imgGanadora.style.objectFit = "contain";
  imgGanadora.dataset.skinId = skinGanadora.id;
  
  divGanadora.appendChild(imgGanadora);
  ruletaBar.appendChild(divGanadora);
  
  // Guardar el índice de la ganadora ANTES de agregar items extras
  const indexGanadorGuardado = ruletaBar.children.length - 1;
  window.indexGanadorGuardado = indexGanadorGuardado;
  
  // Agregar items DESPUÉS para rellenar el espacio blanco (sin afectar el cálculo)
  const tipos2 = ["comun", "rara", "epica", "legendaria"];
  for (let i = 0; i < 2; i++) {
    tipos2.forEach(tipo => {
      const div = document.createElement("div");
      div.className = "item";
      div.dataset.tipo = tipo;

      const skinsTipo = skins[tipo];
      const skinSeleccionada = skinsTipo[Math.floor(Math.random() * skinsTipo.length)];
      asignarClaseRareza(div, tipo, skinSeleccionada.id);
      
      const img = document.createElement("img");
      img.src = skinSeleccionada.src;
      img.style.width = "140px";
      img.style.height = "140px";
      img.style.objectFit = "contain";
      img.dataset.skinId = skinSeleccionada.id;

      div.appendChild(img);
      ruletaBar.appendChild(div);
    });
  }
}

// Función auxiliar para asignar clase de rareza según el tipo y nombre de skin
function asignarClaseRareza(element, tipo, skinId) {
  if (tipo === "legendaria") {
    // legendaria4 y legendaria5 son doradas, el resto son rojas
    if (skinId === "legendaria4" || skinId === "legendaria5") {
      element.classList.add("legendaria-dorada");
    } else if (skinId === "legendaria1" || skinId === "legendaria2" || skinId === "legendaria3") {
      element.classList.add("legendaria-roja");
    } else if (skinId === "") {
      // Si no tiene ID especificado (items aleatorios), usar roja por defecto
      element.classList.add("legendaria-roja");
    }
  }
}

// Generar ruleta inicial sin ganadora especificada
function generarRuleta() {
  if (!ruletaBar) return;
  ruletaBar.innerHTML = "";
  const tipos = ["comun", "rara", "epica", "legendaria"];
  for (let i = 0; i < 20; i++) {
    tipos.forEach(tipo => {
      const div = document.createElement("div");
      div.className = "item";
      div.dataset.tipo = tipo;

      const skinsTipo = skins[tipo];
      const skinSeleccionada = skinsTipo[Math.floor(Math.random() * skinsTipo.length)];
      asignarClaseRareza(div, tipo, skinSeleccionada.id);
      
      const img = document.createElement("img");
      img.src = skinSeleccionada.src;
      img.style.width = "140px";
      img.style.height = "140px";
      img.style.objectFit = "contain";
      img.dataset.skinId = skinSeleccionada.id;

      div.appendChild(img);
      ruletaBar.appendChild(div);
    });
  }
}
generarRuleta();

// Función para actualizar saldo y nombre de usuario
async function actualizarSaldo() {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const snap = await getDoc(doc(db, "users", user.uid));
    const saldo = snap.exists() ? (snap.data().saldo || 0) : 0;

    if (saldoBtn) saldoBtn.innerHTML = `<span class="dolar">$</span>${saldo.toFixed(2)}`;
    if (userNombreElem) userNombreElem.textContent = user.displayName || user.email || "Usuario";
  } catch (err) {
    console.error("Error actualizando saldo y nombre:", err);
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

    // Caja de pago
    if (tipoCajaActual && tipoCajaActual.startsWith("pago")) {
      const precio = preciosPago[tipoCajaActual] ?? 2;
      const userRef = doc(db, "users", user.uid);

      try {
        await runTransaction(db, async (transaction) => {
          const sf = await transaction.get(userRef);
          if (!sf.exists()) throw new Error("Usuario no encontrado.");
          const saldoActual = sf.data().saldo ?? 0;
          if (saldoActual < precio) throw new Error(`No tienes suficiente dinero para abrir esta caja.\nSaldo: ${saldoActual.toFixed(2)} €`);
          transaction.update(userRef, { saldo: +(saldoActual - precio).toFixed(2) });
        });
        openingPaid = true;
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

    // Seleccionar una skin específica del tipo ganado basada en probabilidades de precio
    const probTipos = {};
    probTipos[skinGanada] = 100;
    const probSkins = calcularProbabilidadesSkins(probTipos);
    
    const randSkin = Math.random() * 100;
    let acumulado = 0;
    let indiceSeleccionado = 0;
    for (let i = 0; i < probSkins[skinGanada].length; i++) {
      acumulado += probSkins[skinGanada][i];
      if (randSkin < acumulado) {
        indiceSeleccionado = i;
        break;
      }
    }
    skinSeleccionadaObj = skins[skinGanada][indiceSeleccionado];

    // Generar ruleta con la skin ganadora al final
    generarRuletaConGanadora(skinSeleccionadaObj);

    // Esperar a que se renderice para obtener el ancho correcto
    setTimeout(() => {
      const items = [...ruletaBar.children];
      // Usar el índice guardado de la ganadora (no el último)
      const indexGanador = window.indexGanadorGuardado;

      const itemWidth = items[0].offsetWidth + 20; // incluir margen
      const containerWidth = ruletaContainer.offsetWidth;

      // Calcular posición del centro del item ganador
      const itemCenter = indexGanador * itemWidth + itemWidth / 2;
      const desplazamiento = -(itemCenter - containerWidth / 2);

      ruletaBar.style.transition = "transform 4s cubic-bezier(.17,.67,.32,1)";
      ruletaBar.style.transform = `translateX(${desplazamiento}px)`;

      setTimeout(() => {
        if (popup) popup.style.display = "none";
        ruletaBar.style.transition = "none";
        ruletaBar.style.transform = "translateX(0)";
        mostrarResultado();
      }, 4500);
    }, 50);
  };
}

// Mostrar resultado y permitir vender
function mostrarResultado() {
  const valor = skinSeleccionadaObj.valor;

  const modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100%";
  modal.style.height = "100%";
  modal.style.background = "rgba(0,0,0,0.8)";
  modal.style.display = "flex";
  modal.style.justifyContent = "center";
  modal.style.alignItems = "center";
  modal.style.zIndex = "3000";
  modal.style.backdropFilter = "blur(5px)";

  const caja = document.createElement("div");
  caja.style.background = "linear-gradient(180deg, #ffffff, #f8f9fa)";
  caja.style.padding = "40px 50px";
  caja.style.borderRadius = "20px";
  caja.style.textAlign = "center";
  caja.style.maxWidth = "500px";
  caja.style.boxShadow = "0 20px 60px rgba(0,0,0,0.3)";
  caja.style.border = "2px solid rgba(255,255,255,0.9)";

  const texto = document.createElement("h2");
  texto.textContent = `Has conseguido una skin ${skinGanada.toUpperCase()}!`;
  texto.style.margin = "0 0 8px 0";
  texto.style.color = "#333";
  texto.style.fontSize = "1.8rem";
  texto.style.fontWeight = "700";

  const nombreSkin = document.createElement("h3");
  nombreSkin.textContent = skinSeleccionadaObj.nombre;
  nombreSkin.style.margin = "0 0 30px 0";
  nombreSkin.style.color = "#888";
  nombreSkin.style.fontWeight = "600";
  nombreSkin.style.fontSize = "1.3rem";

  const imgContainer = document.createElement("div");
  imgContainer.style.width = "100%";
  imgContainer.style.height = "280px";
  imgContainer.style.display = "flex";
  imgContainer.style.justifyContent = "center";
  imgContainer.style.alignItems = "center";
  imgContainer.style.margin = "25px 0 35px 0";
  imgContainer.style.background = "linear-gradient(135deg, #f0f0f0, #e8e8e8)";
  imgContainer.style.borderRadius = "15px";
  imgContainer.style.padding = "15px";

  const img = document.createElement("img");
  img.src = skinSeleccionadaObj.src;
  img.style.maxWidth = "100%";
  img.style.maxHeight = "100%";
  img.style.objectFit = "contain";

  imgContainer.appendChild(img);

  const btnVender = document.createElement("button");
  btnVender.type = "button";
  btnVender.textContent = `✓ Vender por ${valor.toFixed(2)} €`;
  btnVender.style.padding = "14px 45px";
  btnVender.style.border = "none";
  btnVender.style.borderRadius = "12px";
  btnVender.style.background = "linear-gradient(135deg, #ff6b9d, #c44569)";
  btnVender.style.color = "white";
  btnVender.style.fontWeight = "bold";
  btnVender.style.fontSize = "1.1rem";
  btnVender.style.cursor = "pointer";
  btnVender.style.boxShadow = "0 8px 25px rgba(255, 107, 157, 0.3)";
  btnVender.style.transition = "all 0.3s ease";
  btnVender.style.width = "100%";
  btnVender.style.marginTop = "10px";

  btnVender.onmouseover = () => {
    btnVender.style.transform = "translateY(-3px)";
    btnVender.style.boxShadow = "0 12px 35px rgba(255, 107, 157, 0.4)";
  };

  btnVender.onmouseout = () => {
    btnVender.style.transform = "translateY(0)";
    btnVender.style.boxShadow = "0 8px 25px rgba(255, 107, 157, 0.3)";
  };

  btnVender.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    modal.remove();

    const user = auth.currentUser;
    if (!user) {
      alert("Sesión perdida, vuelve a iniciar sesión.");
      return;
    }

    const ref = doc(db, "users", user.uid);
    try {
      await runTransaction(db, async (transaction) => {
        const sf = await transaction.get(ref);
        if (!sf.exists()) throw new Error("Usuario no encontrado.");
        let saldo = sf.data().saldo ?? 0;

        if (tipoCajaActual && tipoCajaActual.startsWith("pago") && !openingPaid) {
          if (saldo < (preciosPago[tipoCajaActual] ?? 2)) throw new Error("Saldo insuficiente al intentar cobrar la caja.");
          saldo = +(saldo - (preciosPago[tipoCajaActual] ?? 2)).toFixed(2);
        }

        saldo = +(saldo + valor).toFixed(2);
        transaction.update(ref, { saldo });
      });

      await actualizarSaldo();
      alert(`Skin vendida por ${valor.toFixed(2)} €. Saldo actualizado.`);
    } catch (err) {
      console.error("Error al vender y actualizar saldo:", err);
      alert(err.message || "Error al procesar la venta.");
    } finally {
      openingPaid = false;
      openingUserUid = null;
    }
  };

  caja.appendChild(texto);
  caja.appendChild(nombreSkin);
  caja.appendChild(imgContainer);
  caja.appendChild(btnVender);
  modal.appendChild(caja);
  document.body.appendChild(modal);
}

// Ejecutamos para mostrar saldo y nombre al cargar
auth.onAuthStateChanged(actualizarSaldo);

// Exportar skins a variable global para batalla.js
window.skinsData = skins;
