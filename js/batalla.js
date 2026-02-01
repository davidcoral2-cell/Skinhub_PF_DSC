// js/batalla.js
import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Estado de la batalla
let estadoBatalla = {
  cajasAgregadas: [],
  costTotal: 0,
  indiceActual: 0,
  totalUsuario: 0,
  totalBot: 0,
  resultados: [],
  fase: "creacion" // creacion, batalla, resultado
};

// Precios de cajas de pago
const preciosPago = {
  pago1: 2.30,
  pago2: 2.93,
  pago3: 3.28,
  pago4: 4.13
};

// Datos de skins (copia local para batalla.js)
const skinsData = {
  comun: [
    { id: "comun1", src: "../img/comun1.png", valor: 0.07, nombre: "MAC-10 | Sakkaku" },
    { id: "comun2", src: "../img/comun2.png", valor: 0.09, nombre: "Sticker | Peek-a-Boo" },
    { id: "comun3", src: "../img/comun3.png", valor: 0.03, nombre: "M4A1-S | Welcome to the Jungle" },
    { id: "comun4", src: "../img/comun4.png", valor: 0.11, nombre: "Zeus x27 | Olympus" },
    { id: "comun5", src: "../img/comun5.png", valor: 0.12, nombre: "MP9 | Buff Blue" }
  ],
  rara: [
    { id: "rara1", src: "../img/rara1.png", valor: 0.33, nombre: "AK-47 | Neon Rider" },
    { id: "rara2", src: "../img/rara2.png", valor: 0.47, nombre: "AWP | Pit Viper" },
    { id: "rara3", src: "../img/rara3.png", valor: 0.52, nombre: "AK-47 | Ice Coaled" },
    { id: "rara4", src: "../img/rara4.png", valor: 0.61, nombre: "M4A1-S | Vaporwave" },
    { id: "rara5", src: "../img/rara5.png", valor: 0.62, nombre: "Glock-18 | Shinobu" }
  ],
  epica: [
    { id: "epica1", src: "../img/epica1.png", valor: 1.85, nombre: "Deser Eagle | Printstream" },
    { id: "epica2", src: "../img/epica2.png", valor: 1.94, nombre: "AK-47 | Asiimov" },
    { id: "epica3", src: "../img/epica3.png", valor: 2.03, nombre: "Deser Eagle | Tilted" },
    { id: "epica4", src: "../img/epica4.png", valor: 2.10, nombre: "USP-S | The Traitor" },
    { id: "epica5", src: "../img/epica5.png", valor: 2.21, nombre: "Shadow Daggers | Lore" }
  ],
  legendaria: [
    { id: "legendaria1", src: "../img/legendaria1.png", valor: 13.97, nombre: "M4A4 | Howl" },
    { id: "legendaria2", src: "../img/legendaria2.png", valor: 14.71, nombre: "AWP | Dragon Lore" },
    { id: "legendaria3", src: "../img/legendaria3.png", valor: 15.66, nombre: "Karambit | Gamma Doppler Emerald" },
    { id: "legendaria4", src: "../img/legendaria4.png", valor: 18.95, nombre: "Butterfly Knife | Doppler Ruby" },
    { id: "legendaria5", src: "../img/legendaria5.png", valor: 21.13, nombre: "AK-47 | Wild Lotus" }
  ]
};

let cajaSeleccionada = null;

// Inicializar cuando carga la página
let usuarioAutenticado = false;

auth.onAuthStateChanged((usuario) => {
  if (!usuario) {
    // Guardar que venimos de batalla.html para volver después de login
    sessionStorage.setItem('refererPage', './batalla.html');
    // Si no hay usuario, redirigir a login
    window.location.href = "./login.html";
  } else {
    usuarioAutenticado = true;
    // Solo inicializar después de confirmar que hay usuario
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        inicializarEventos();
        actualizarSaldoDisplay();
      });
    } else {
      inicializarEventos();
      actualizarSaldoDisplay();
    }
  }
});

function inicializarEventos() {
  // Seleccionar caja
  document.querySelectorAll(".caja-opcion").forEach(opcion => {
    opcion.addEventListener("click", () => {
      document.querySelectorAll(".caja-opcion").forEach(o => o.classList.remove("seleccionada"));
      opcion.classList.add("seleccionada");
      cajaSeleccionada = {
        caja: opcion.dataset.caja,
        nombre: opcion.querySelector("h3").textContent,
        precio: parseFloat(opcion.querySelector(".precio").textContent)
      };
    });
  });

  // Agregar caja
  document.getElementById("btnAgregarCaja").addEventListener("click", agregarCaja);

  // Crear batalla
  document.getElementById("btnCrearBatalla").addEventListener("click", crearBatalla);

  // Siguiente caja
  document.getElementById("btnSiguienteCaja").addEventListener("click", abrirSiguienteCaja);
}

function agregarCaja() {
  if (!cajaSeleccionada) {
    alert("Selecciona una caja primero");
    return;
  }

  const cantidad = parseInt(document.getElementById("cantidadInput").value) || 1;

  for (let i = 0; i < cantidad; i++) {
    estadoBatalla.cajasAgregadas.push({
      ...cajaSeleccionada,
      id: Date.now() + Math.random()
    });
  }

  actualizarListaCajasAgregadas();
  actualizarCostoTotal();
  document.getElementById("cantidadInput").value = 1;
}

function actualizarListaCajasAgregadas() {
  const lista = document.getElementById("listaCajasAgregadas");
  lista.innerHTML = "";

  // Agrupar cajas por nombre
  const agrupadas = {};
  estadoBatalla.cajasAgregadas.forEach(caja => {
    if (!agrupadas[caja.nombre]) {
      agrupadas[caja.nombre] = { caja, cantidad: 0 };
    }
    agrupadas[caja.nombre].cantidad++;
  });

  Object.values(agrupadas).forEach(({ caja, cantidad }) => {
    const div = document.createElement("div");
    div.className = "caja-agregada";

    const totalCaja = caja.precio * cantidad;

    div.innerHTML = `
      <span>${caja.nombre} x${cantidad}</span>
      <span>${totalCaja.toFixed(2)} €</span>
      <button class="eliminar" data-nombre="${caja.nombre}">✕</button>
    `;

    div.querySelector(".eliminar").addEventListener("click", () => {
      estadoBatalla.cajasAgregadas = estadoBatalla.cajasAgregadas.filter(
        c => c.nombre !== caja.nombre
      );
      actualizarListaCajasAgregadas();
      actualizarCostoTotal();
    });

    lista.appendChild(div);
  });
}

function actualizarCostoTotal() {
  estadoBatalla.costTotal = estadoBatalla.cajasAgregadas.reduce((sum, caja) => sum + caja.precio, 0);
  
  document.getElementById("costoTotal").textContent = estadoBatalla.costTotal.toFixed(2) + " €";
  document.getElementById("costoTotal2").textContent = estadoBatalla.costTotal.toFixed(2) + " €";
  document.getElementById("cajasTotal").textContent = estadoBatalla.cajasAgregadas.length;
  
  actualizarEstadoBotones();
}

function actualizarSaldoDisplay() {
  const usuario = auth.currentUser;
  if (!usuario) return;

  getDoc(doc(db, "users", usuario.uid)).then(snap => {
    if (snap.exists()) {
      const saldo = snap.data().saldo || 0;
      document.querySelector(".saldo").innerHTML = `<span class="dolar">$</span>${saldo.toFixed(2)}`;
      document.getElementById("saldoDisponible").textContent = saldo.toFixed(2) + " €";
      actualizarEstadoBotones();
    }
  });
}

function actualizarEstadoBotones() {
  const usuario = auth.currentUser;
  if (!usuario) return;

  const btnCrear = document.getElementById("btnCrearBatalla");
  const tieneCAjas = estadoBatalla.cajasAgregadas.length > 0;

  getDoc(doc(db, "users", usuario.uid)).then(snap => {
    if (snap.exists()) {
      const saldo = snap.data().saldo || 0;
      const puedeCrear = tieneCAjas && saldo >= estadoBatalla.costTotal;
      btnCrear.disabled = !puedeCrear;
    }
  });
}

async function crearBatalla() {
  const usuario = auth.currentUser;
  if (!usuario) {
    alert("Debes iniciar sesión");
    return;
  }

  if (estadoBatalla.cajasAgregadas.length === 0) {
    alert("Agrega al menos una caja");
    return;
  }

  try {
    const userRef = doc(db, "users", usuario.uid);

    // Usar transacción para descontar dinero
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(userRef);
      if (!snap.exists()) throw new Error("Usuario no encontrado");

      const saldoActual = snap.data().saldo || 0;
      if (saldoActual < estadoBatalla.costTotal) {
        throw new Error(`Saldo insuficiente. Necesitas ${estadoBatalla.costTotal.toFixed(2)}€`);
      }

      const nuevoSaldo = +(saldoActual - estadoBatalla.costTotal).toFixed(2);
      transaction.update(userRef, { saldo: nuevoSaldo });
    });

    // Generar resultados para toda la batalla
    generarResultadosBatalla();

    // Cambiar a vista de batalla
    document.getElementById("seccionCreacion").style.display = "none";
    document.getElementById("seccionBatalla").style.display = "block";
    estadoBatalla.fase = "batalla";
    estadoBatalla.indiceActual = 0;
    estadoBatalla.totalUsuario = 0;
    estadoBatalla.totalBot = 0;

    // Crear el slider de cajas
    crearSliderCajas();

    // Abrir primera caja
    setTimeout(() => abrirSiguienteCaja(), 500);

  } catch (err) {
    console.error("Error:", err);
    alert(err.message || "Error al crear la batalla");
  }
}

// Crear slider de cajas arriba
function crearSliderCajas() {
  const slider = document.getElementById("cajasSlider");
  slider.innerHTML = "";
  
  // Mapeo de tipos de caja a imágenes
  const imagenesCajas = {
    pago1: "../img/caja_pago4.png",
    pago2: "../img/caja_pago.png",
    pago3: "../img/Caja_pago3.png",
    pago4: "../img/caja_pago2.png"
  };
  
  estadoBatalla.cajasAgregadas.forEach((caja, index) => {
    const item = document.createElement("div");
    item.className = "caja-slider-item";
    item.dataset.index = index;
    
    const img = document.createElement("img");
    // Usar caja.caja que es donde se guarda el tipo (pago1, pago2, etc.)
    img.src = imagenesCajas[caja.caja] || "../img/caja_pago.png";
    img.alt = caja.nombre;
    
    item.appendChild(img);
    slider.appendChild(item);
  });
  
  // Marcar la primera como activa
  actualizarSliderCajas(0);
}

// Actualizar el slider de cajas (marcar activa y abiertas)
function actualizarSliderCajas(indiceActual) {
  const items = document.querySelectorAll(".caja-slider-item");
  
  items.forEach((item, index) => {
    item.classList.remove("activa", "abierta");
    
    if (index < indiceActual) {
      item.classList.add("abierta");
    } else if (index === indiceActual) {
      item.classList.add("activa");
    }
  });
}

function generarResultadosBatalla() {
  estadoBatalla.resultados = estadoBatalla.cajasAgregadas.map(() => {
    return {
      userSkin: obtenerSkinAleatoria(),
      botSkin: obtenerSkinAleatoria()
    };
  });
}

function obtenerSkinAleatoria() {
  const tipos = ["comun", "rara", "epica", "legendaria"];
  const tipoAleatorio = tipos[Math.floor(Math.random() * tipos.length)];
  const skinsDelTipo = skinsData[tipoAleatorio];
  
  if (!skinsDelTipo || skinsDelTipo.length === 0) {
    return {
      nombre: "Skin Desconocida",
      src: "../img/comun1.png",
      valor: 0.10
    };
  }

  return skinsDelTipo[Math.floor(Math.random() * skinsDelTipo.length)];
}

function abrirSiguienteCaja() {
  if (estadoBatalla.indiceActual >= estadoBatalla.cajasAgregadas.length) {
    mostrarResultado();
    return;
  }

  const resultado = estadoBatalla.resultados[estadoBatalla.indiceActual];
  const totalCajas = estadoBatalla.cajasAgregadas.length;
  const cajaActual = estadoBatalla.indiceActual + 1;

  // Actualizar slider de cajas - marcar la actual como activa
  actualizarSliderCajas(estadoBatalla.indiceActual);

  // Actualizar ronda
  document.getElementById("rondaActual").textContent = `Ronda ${cajaActual} de ${totalCajas}`;

  // Actualizar barra de progreso
  const porcentaje = (cajaActual / totalCajas) * 100;
  const barraProgreso = document.getElementById("barraProgreso");
  setTimeout(() => {
    barraProgreso.style.width = porcentaje + '%';
  }, 50);

  // Mostrar skins
  mostrarSkin("usuario", resultado.userSkin);
  mostrarSkin("bot", resultado.botSkin);

  // Sumar valores (los totales se muestran al terminar la animación en mostrarSkin)
  estadoBatalla.totalUsuario += resultado.userSkin.valor;
  estadoBatalla.totalBot += resultado.botSkin.valor;

  // Siguiente índice
  estadoBatalla.indiceActual++;

  // Cambiar texto del botón en la última caja
  const btn = document.getElementById("btnSiguienteCaja");
  if (estadoBatalla.indiceActual >= totalCajas) {
    btn.textContent = "Ver resultado";
  }
}

function mostrarSkin(tipo, skin) {
  const ruletaId = tipo === "usuario" ? "ruletaUserSkins" : "ruletaBotSkins";
  const imgId = tipo === "usuario" ? "userSkinImg" : "botSkinImg";
  const valorId = tipo === "usuario" ? "userSkinValor" : "botSkinValor";
  const totalId = tipo === "usuario" ? "totalUsuario" : "totalBot";

  const ruleta = document.getElementById(ruletaId);
  const imgResultado = document.getElementById(imgId);
  const valorElement = document.getElementById(valorId);
  
  if (!ruleta) {
    console.error("No se encontró el elemento ruleta:", ruletaId);
    return;
  }
  
  // Ocultar imagen y valor mientras gira
  imgResultado.style.display = "none";
  valorElement.textContent = "";
  
  // Limpiar contenedor anterior y resetear transform
  ruleta.innerHTML = "";
  ruleta.style.transition = "none";
  ruleta.style.transform = "translateY(0)";
  
  // Configuración de la animación
  const duracionTotal = 4000; // 4 segundos
  const numItems = 50; // Cantidad de items en la tira
  const posicionGanadora = 42; // Posición de la skin ganadora
  const itemHeight = 80; // 70px height + 10px gap
  
  // Obtener todas las skins disponibles
  const todasLasSkins = [
    ...skinsData.comun,
    ...skinsData.rara,
    ...skinsData.epica,
    ...skinsData.legendaria
  ];
  
  // Función para obtener skin aleatoria
  function getSkinAleatoria() {
    return todasLasSkins[Math.floor(Math.random() * todasLasSkins.length)];
  }
  
  // Crear la tira de items con skins aleatorias
  for (let i = 0; i < numItems; i++) {
    const item = document.createElement("div");
    item.className = "ruleta-item";
    
    const img = document.createElement("img");
    
    // En la posición ganadora, poner la skin que debe ganar
    if (i === posicionGanadora) {
      img.src = skin.src;
      img.alt = skin.nombre;
    } else {
      const skinRandom = getSkinAleatoria();
      img.src = skinRandom.src;
      img.alt = skinRandom.nombre;
    }
    
    item.appendChild(img);
    ruleta.appendChild(item);
  }
  
  // Calcular desplazamiento para centrar la skin ganadora
  // Centro del contenedor = 125px (250/2)
  // Posición del item ganador = posicionGanadora * itemHeight
  // Queremos que el centro del item ganador esté en el centro del contenedor
  const centroContenedor = 125;
  const posicionItemY = posicionGanadora * itemHeight;
  const centroItem = 35; // Mitad de 70px
  const desplazamiento = posicionItemY + centroItem - centroContenedor;
  
  // Forzar reflow
  ruleta.offsetHeight;
  
  // Aplicar animación después de un pequeño delay
  setTimeout(() => {
    ruleta.style.transition = `transform ${duracionTotal}ms cubic-bezier(0.1, 0.7, 0.2, 1)`;
    ruleta.style.transform = `translateY(-${desplazamiento}px)`;
  }, 50);
  
  // Al terminar la animación
  setTimeout(() => {
    // Marcar la ganadora visualmente
    const items = ruleta.querySelectorAll(".ruleta-item");
    if (items[posicionGanadora]) {
      items[posicionGanadora].classList.add("ganadora");
    }
    
    // Mostrar imagen y valor
    imgResultado.src = skin.src;
    imgResultado.alt = skin.nombre;
    imgResultado.style.display = "block";
    valorElement.textContent = "+" + skin.valor.toFixed(2) + " €";
    
    // Actualizar el total
    if (tipo === "usuario") {
      document.getElementById(totalId).textContent = estadoBatalla.totalUsuario.toFixed(2) + " €";
    } else {
      document.getElementById(totalId).textContent = estadoBatalla.totalBot.toFixed(2) + " €";
    }
  }, duracionTotal + 100);
}

function mostrarResultado() {
  const usuario = auth.currentUser;
  
  const usuarioGana = estadoBatalla.totalUsuario > estadoBatalla.totalBot;
  const empate = estadoBatalla.totalUsuario === estadoBatalla.totalBot;

  let dineroGanado = 0;
  if (usuarioGana) {
    dineroGanado = estadoBatalla.totalUsuario + estadoBatalla.totalBot;
  }
  if (empate) {
    dineroGanado = estadoBatalla.totalUsuario;
  }

  // Actualizar saldo en BD (si gana o empata)
  if ((usuarioGana || empate) && usuario) {
    actualizarSaldoFinal(usuario.uid, dineroGanado);
  } else if (usuario) {
    // Actualizar saldo display aunque haya perdido (no sumamos nada)
    actualizarSaldoDisplay();
  }

  // Mostrar resultado
  document.getElementById("seccionBatalla").style.display = "none";
  document.getElementById("seccionResultado").style.display = "block";
  estadoBatalla.fase = "resultado";

  const contenido = document.getElementById("resultadoContenido");

  let titulo, clase;
  if (usuarioGana) {
    titulo = "🎉 ¡GANASTE LA BATALLA!";
    clase = "ganador";
  } else if (empate) {
    titulo = "🤝 ¡EMPATE!";
    clase = "empate";
  } else {
    titulo = "😢 PERDISTE LA BATALLA";
    clase = "perdedor";
  }

  contenido.innerHTML = `
    <h1 class="resultado-titulo ${clase}">${titulo}</h1>
    
    <div class="resultado-detalles">
      <div class="resultado-item">
        <span>Tu ganancia:</span>
        <span class="valor">${estadoBatalla.totalUsuario.toFixed(2)} €</span>
      </div>
      <div class="resultado-item">
        <span>Ganancia del Bot:</span>
        <span class="valor">${estadoBatalla.totalBot.toFixed(2)} €</span>
      </div>
      <div class="resultado-item ganancia">
        <span>Total obtenido:</span>
        <span class="valor">${dineroGanado.toFixed(2)} €</span>
      </div>
    </div>
    
    <div class="resultado-botones">
      <button id="btnVolver" class="btn-volver">← Volver al inicio</button>
      <button id="btnNuevaBatalla" class="btn-nueva-batalla">⚔️ Nueva batalla</button>
    </div>
  `;

  document.getElementById("btnVolver").addEventListener("click", () => {
    window.location.href = "../index.html";
  });

  document.getElementById("btnNuevaBatalla").addEventListener("click", nuevaBatalla);
}

async function actualizarSaldoFinal(uid, dineroGanado) {
  try {
    const userRef = doc(db, "users", uid);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(userRef);
      if (!snap.exists()) throw new Error("Usuario no encontrado");

      let saldoActual = snap.data().saldo || 0;
      saldoActual = +(saldoActual + dineroGanado).toFixed(2);

      transaction.update(userRef, { saldo: saldoActual });
    });

    actualizarSaldoDisplay();
  } catch (err) {
    console.error("Error actualizando saldo:", err);
  }
}

function nuevaBatalla() {
  estadoBatalla = {
    cajasAgregadas: [],
    costTotal: 0,
    indiceActual: 0,
    totalUsuario: 0,
    totalBot: 0,
    resultados: [],
    fase: "creacion"
  };

  cajaSeleccionada = null;

  document.getElementById("seccionCreacion").style.display = "block";
  document.getElementById("seccionBatalla").style.display = "none";
  document.getElementById("seccionResultado").style.display = "none";

  document.getElementById("listaCajasAgregadas").innerHTML = "";
  document.getElementById("costoTotal").textContent = "0.00 €";
  document.getElementById("costoTotal2").textContent = "0.00 €";
  document.getElementById("cajasTotal").textContent = "0";
  document.getElementById("cantidadInput").value = "1";
  document.getElementById("btnSiguienteCaja").textContent = "Siguiente caja";

  document.querySelectorAll(".caja-opcion").forEach(o => o.classList.remove("seleccionada"));

  actualizarSaldoDisplay();
}

// Actualizar saldo cuando cambie el usuario
auth.onAuthStateChanged(() => {
  actualizarSaldoDisplay();
});
