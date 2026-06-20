/* ===================================================================
   APP.JS — Lógica principal de RifaFiesta
   ================================================================ */

// ---------- Estado global de la app ----------
const state = {
  pantallaActual: 'home',
  sorteoSeleccionado: null,
  numerosSeleccionados: [],
  metodoPago: 'yape',
  vendidosCache: new Set(),
  ultimaCompra: null
};

// ---------- Navegación entre pantallas ----------
function irA(pantalla, params = {}) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + pantalla);
  if (target) target.classList.add('active');
  state.pantallaActual = pantalla;
  window.scrollTo(0, 0);

  if (pantalla === 'detalle' && params.sorteoId) {
    cargarDetalleSorteo(params.sorteoId);
  }
  if (pantalla === 'seleccion' && params.sorteoId) {
    cargarSeleccion(params.sorteoId);
  }
  actualizarTabbar(pantalla);
}

function actualizarTabbar(pantalla) {
  const mapa = { home: 0, calendario: 1, ganadores: 2, perfil: 3 };
  document.querySelectorAll('.tab-item').forEach((tab, i) => {
    tab.classList.toggle('active', i === mapa[pantalla]);
  });
}

// ---------- HOME: listado de sorteos ----------
async function renderHome() {
  const sorteos = await obtenerSorteos();
  const lista = document.getElementById('lista-sorteos');
  lista.innerHTML = '';

  for (const s of sorteos) {
    const vendidos = await obtenerBoletosVendidos(s.id);
    const pct = Math.round((vendidos.size / s.total_boletos) * 100);

    const badgeClass = s.badge === 'Nuevo' ? 'nuevo' : (s.badge === 'Últimos boletos' ? 'ultimos' : '');
    const temaClass = 'tema-' + (s.tema === 'moto' ? 'moto' : s.tema === 'tv' ? 'tv' : s.tema === 'viaje' ? 'viaje' : 'navidad');

    const card = document.createElement('div');
    card.className = 'sorteo-card';
    card.onclick = () => irA('detalle', { sorteoId: s.id });
    card.innerHTML = `
      <div class="card-img ${temaClass}">
        <div class="card-badge ${badgeClass}">${s.badge}</div>
        <span class="card-img-emoji">${s.premio_emoji}</span>
        <div class="card-img-content">
          <div class="card-fest-onimg">${s.emoji_fest} ${s.festividad}</div>
          <div class="card-title-onimg">${s.premio_nombre}</div>
        </div>
      </div>
      <div class="card-body">
        <div class="card-progress-label"><span>${vendidos.size} vendidos</span><span>${pct}% del total</span></div>
        <div class="card-progress-bar"><div class="card-progress-fill" style="width:${pct}%"></div></div>
        <div class="card-footer">
          <div class="card-price-block">
            <span class="card-price">S/${s.precio_boleto}</span>
            <span class="card-price-unit">/ boleto</span>
          </div>
          <div class="card-btn-go">Participar →</div>
        </div>
      </div>
    `;
    lista.appendChild(card);
  }

  // Banner countdown con el sorteo más próximo destacado
  const destacado = sorteos.find(s => s.destacado) || sorteos[0];
  if (destacado) {
    document.getElementById('banner-titulo').textContent = `${destacado.premio_nombre}`;
    document.getElementById('banner-tag').textContent = `${destacado.emoji_fest} ${destacado.festividad}`;
    iniciarCountdown(destacado.fecha_sorteo, 'cd-dias', 'cd-hrs', 'cd-min');
  }
}

// ---------- DETALLE de sorteo ----------
async function cargarDetalleSorteo(sorteoId) {
  const s = await obtenerSorteoPorId(sorteoId);
  if (!s) return;
  state.sorteoSeleccionado = s;
  const vendidos = await obtenerBoletosVendidos(sorteoId);
  state.vendidosCache = vendidos;
  const pct = Math.round((vendidos.size / s.total_boletos) * 100);
  const disponibles = s.total_boletos - vendidos.size;

  const el = document.getElementById('screen-detalle');
  el.querySelector('.hero-img-emoji').textContent = s.premio_emoji;
  el.querySelector('.detail-fest').textContent = `${s.emoji_fest} ${s.festividad.toUpperCase()} · ${s.region.toUpperCase()}`;
  el.querySelector('.detail-title').textContent = s.titulo;
  el.querySelector('.prize-name').textContent = s.premio_nombre;
  el.querySelector('.prize-value').textContent = `Valorizado en S/ ${s.premio_valor.toLocaleString('es-PE')}`;
  el.querySelector('.fecha-sorteo-valor').textContent = formatearFechaLarga(s.fecha_sorteo);
  el.querySelector('.precio-boleto-valor').textContent = `S/ ${s.precio_boleto.toFixed(2)}`;
  el.querySelector('.vendidos-valor').textContent = `${vendidos.size} / ${s.total_boletos}`;
  el.querySelector('.progress-fill2').style.width = pct + '%';
  el.querySelector('.disponibles-texto').textContent = `${disponibles} disponibles`;
  el.querySelector('.pct-texto').textContent = `${pct}% vendido`;
  el.querySelector('.desc-text').textContent = s.descripcion;
  el.querySelector('.footer-price-num').textContent = `S/${s.precio_boleto}`;
}

// ---------- SELECCIÓN de números + checkout ----------
async function cargarSeleccion(sorteoId) {
  const s = state.sorteoSeleccionado || await obtenerSorteoPorId(sorteoId);
  state.sorteoSeleccionado = s;
  state.numerosSeleccionados = [];
  const vendidos = state.vendidosCache.size ? state.vendidosCache : await obtenerBoletosVendidos(sorteoId);
  state.vendidosCache = vendidos;

  const el = document.getElementById('screen-seleccion');
  el.querySelector('.summary-icon').textContent = s.premio_emoji;
  el.querySelector('.summary-title').textContent = s.titulo;
  el.querySelector('.summary-sub').textContent = `${s.premio_nombre} · S/${s.precio_boleto} por boleto`;

  renderGrillaNumeros(vendidos, s.total_boletos);
  actualizarTotal();
}

function renderGrillaNumeros(vendidos, total) {
  const grid = document.getElementById('num-grid');
  grid.innerHTML = '';
  // Mostramos una muestra navegable de 30 números para el MVP visual
  const muestra = Math.min(30, total);
  const inicio = 1;
  for (let i = inicio; i < inicio + muestra; i++) {
    const vendido = vendidos.has(i);
    const cell = document.createElement('div');
    cell.className = 'num-cell' + (vendido ? ' sold' : '');
    cell.textContent = String(i).padStart(3, '0');
    if (!vendido) {
      cell.onclick = () => toggleNumero(i, cell);
    }
    grid.appendChild(cell);
  }
}

function toggleNumero(n, el) {
  const idx = state.numerosSeleccionados.indexOf(n);
  if (idx >= 0) {
    state.numerosSeleccionados.splice(idx, 1);
    el.classList.remove('selected');
  } else {
    state.numerosSeleccionados.push(n);
    el.classList.add('selected');
  }
  actualizarTotal();
}

function elegirAlAzar() {
  const s = state.sorteoSeleccionado;
  const disponibles = [];
  for (let i = 1; i <= 30; i++) {
    if (!state.vendidosCache.has(i) && !state.numerosSeleccionados.includes(i)) disponibles.push(i);
  }
  if (disponibles.length === 0) return;
  const random = disponibles[Math.floor(Math.random() * disponibles.length)];
  state.numerosSeleccionados.push(random);
  renderGrillaNumeros(state.vendidosCache, s.total_boletos);
  // Re-marcar seleccionados tras re-render
  document.querySelectorAll('#num-grid .num-cell').forEach(cell => {
    const num = parseInt(cell.textContent);
    if (state.numerosSeleccionados.includes(num)) cell.classList.add('selected');
  });
  actualizarTotal();
}

function seleccionarMetodoPago(metodo, el) {
  state.metodoPago = metodo;
  document.querySelectorAll('.pay-opt').forEach(p => {
    p.classList.remove('selected');
    p.querySelector('.pay-check').textContent = '';
  });
  el.classList.add('selected');
  el.querySelector('.pay-check').textContent = '✓';
}

function actualizarTotal() {
  const s = state.sorteoSeleccionado;
  const cantidad = state.numerosSeleccionados.length;
  const subtotal = cantidad * (s ? s.precio_boleto : 0);

  document.getElementById('total-cantidad').textContent = `${cantidad} boleto${cantidad === 1 ? '' : 's'} × S/${s ? s.precio_boleto : 0}`;
  document.getElementById('total-subtotal').textContent = `S/${subtotal.toFixed(2)}`;
  document.getElementById('total-final').textContent = `S/${subtotal.toFixed(2)}`;

  const btn = document.getElementById('btn-confirmar-pago');
  btn.textContent = cantidad > 0 ? `✅ Confirmar y pagar S/${subtotal.toFixed(2)}` : 'Elige al menos 1 número';
  btn.classList.toggle('disabled', cantidad === 0);
  btn.disabled = cantidad === 0;
}

async function confirmarCompra() {
  if (state.numerosSeleccionados.length === 0) return;
  const s = state.sorteoSeleccionado;
  const compra = await registrarCompra(s.id, [...state.numerosSeleccionados], state.metodoPago);
  state.ultimaCompra = compra;
  renderConfirmacion(s, compra);
  irA('confirmacion');
}

// ---------- CONFIRMACIÓN ----------
function renderConfirmacion(sorteo, compra) {
  const el = document.getElementById('screen-confirmacion');
  el.querySelector('.confirm-title').textContent = `¡Listo, ${USUARIO_ACTUAL.nombre}!`;
  el.querySelector('.ticket-fest').textContent = `${sorteo.emoji_fest} ${sorteo.festividad.toUpperCase()}`;
  el.querySelector('.ticket-name').textContent = sorteo.titulo;

  const numsContainer = el.querySelector('.ticket-nums');
  numsContainer.innerHTML = compra.numeros.map(n =>
    `<div class="ticket-num">${String(n).padStart(3, '0')}</div>`
  ).join('');

  el.querySelector('.fecha-sorteo-ticket').textContent = formatearFechaCorta(sorteo.fecha_sorteo);
  el.querySelector('.total-pagado-ticket').textContent = `S/${(compra.numeros.length * sorteo.precio_boleto).toFixed(2)}`;
}

// ---------- CALENDARIO ----------
const CALENDARIO_DATA = [
  { mes: "Ene", evento: "Marinera · Trujillo", count: "1 sorteo", activo: false },
  { mes: "Feb", evento: "Candelaria · Puno", count: "2 sorteos", activo: false },
  { mes: "Mar", evento: "Semana Santa", count: "1 sorteo", activo: false },
  { mes: "Abr", evento: "Semana Santa Ayacucho", count: "1 sorteo", activo: false },
  { mes: "May", evento: "Fiesta de la Cruz", count: "1 sorteo", activo: false },
  { mes: "Jun", evento: "San Juan · Inti Raymi", count: "2 sorteos activos", activo: true },
  { mes: "Jul", evento: "Fiestas Patrias", count: "1 sorteo activo", activo: true },
  { mes: "Ago", evento: "Santa Rosa de Lima", count: "1 sorteo", activo: false },
  { mes: "Sep", evento: "Mistura", count: "1 sorteo", activo: false },
  { mes: "Oct", evento: "Señor de los Milagros", count: "2 sorteos", activo: false },
  { mes: "Nov", evento: "Todos los Santos", count: "1 sorteo", activo: false },
  { mes: "Dic", evento: "Navidad", count: "1 sorteo activo", activo: true }
];

function renderCalendario() {
  const lista = document.getElementById('lista-calendario');
  lista.innerHTML = CALENDARIO_DATA.map(m => `
    <div class="cal-month-row ${m.activo ? 'activo' : ''}">
      <div class="cal-month-name">${m.mes}</div>
      <div class="cal-month-info">
        <div class="cal-month-evento">${m.evento}</div>
        <div class="cal-month-count">${m.count}</div>
      </div>
    </div>
  `).join('');
}

// ---------- GANADORES ----------
async function renderGanadores() {
  const ganadores = await obtenerGanadores();
  const lista = document.getElementById('lista-ganadores');
  lista.innerHTML = ganadores.map(g => `
    <div class="winner-row">
      <div class="winner-avatar">${g.emoji}</div>
      <div class="winner-info">
        <div class="winner-name">${g.nombre}</div>
        <div class="winner-premio">${g.premio}</div>
        <div class="winner-ciudad">📍 ${g.ciudad}</div>
      </div>
      <div class="winner-check">✓</div>
    </div>
  `).join('');
}

// ---------- PERFIL ----------
function renderPerfil() {
  document.getElementById('perfil-nombre').textContent = USUARIO_ACTUAL.nombre;
  document.getElementById('perfil-telefono').textContent = USUARIO_ACTUAL.telefono;

  const cont = document.getElementById('perfil-tickets');
  if (USUARIO_ACTUAL.boletos_comprados.length === 0) {
    cont.innerHTML = `<div class="profile-empty">Aún no tienes boletos. ¡Participa en un sorteo!</div>`;
    return;
  }
  cont.innerHTML = USUARIO_ACTUAL.boletos_comprados.map(b => {
    const sorteo = SORTEOS.find(s => s.id === b.sorteo_id);
    return `
      <div class="my-ticket-row">
        <div>
          <div class="my-ticket-name">${sorteo ? sorteo.titulo : 'Sorteo'}</div>
          <div class="my-ticket-nums">Números: ${b.numeros.map(n => String(n).padStart(3,'0')).join(', ')}</div>
        </div>
        <div class="my-ticket-status">Confirmado</div>
      </div>
    `;
  }).join('');
}

// ---------- Utilidades de fecha ----------
function formatearFechaCorta(isoString) {
  const f = new Date(isoString);
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${f.getDate()} ${meses[f.getMonth()]}`;
}

function formatearFechaLarga(isoString) {
  const f = new Date(isoString);
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const horas = f.getHours();
  const ampm = horas >= 12 ? 'pm' : 'am';
  const horas12 = horas % 12 || 12;
  return `${f.getDate()} de ${meses[f.getMonth()]} ${f.getFullYear()} · ${horas12}${ampm}`;
}

// ---------- Countdown en vivo ----------
let countdownInterval = null;
function iniciarCountdown(fechaISO, idDias, idHrs, idMin) {
  if (countdownInterval) clearInterval(countdownInterval);

  function actualizar() {
    const target = new Date(fechaISO);
    const ahora = new Date();
    const diff = target - ahora;
    if (diff <= 0) {
      document.getElementById(idDias).textContent = '00';
      document.getElementById(idHrs).textContent = '00';
      document.getElementById(idMin).textContent = '00';
      return;
    }
    const dias = Math.floor(diff / 86400000);
    const hrs = Math.floor((diff % 86400000) / 3600000);
    const min = Math.floor((diff % 3600000) / 60000);
    document.getElementById(idDias).textContent = String(dias).padStart(2, '0');
    document.getElementById(idHrs).textContent = String(hrs).padStart(2, '0');
    document.getElementById(idMin).textContent = String(min).padStart(2, '0');
  }
  actualizar();
  countdownInterval = setInterval(actualizar, 1000 * 30); // refresca cada 30s, suficiente para minutos
}

// ---------- Filtros del home ----------
function filtrarPorCategoria(categoria, el) {
  document.querySelectorAll('.filter-pill').forEach(f => f.classList.remove('active'));
  el.classList.add('active');
  // Para el MVP, el filtro reordena pero no oculta —
  // luego en Supabase esto sería: .eq('categoria', categoria)
  console.log('Filtrando por:', categoria);
}

// ---------- Instalación PWA ----------
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('install-toast').classList.add('show');
});

function instalarPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt = null;
  }
  document.getElementById('install-toast').classList.remove('show');
}

function cerrarToastInstalacion() {
  document.getElementById('install-toast').classList.remove('show');
}

// ---------- Inicialización ----------
document.addEventListener('DOMContentLoaded', () => {
  renderHome();
  renderCalendario();
  renderGanadores();
  renderPerfil();

  // Registrar service worker para que la PWA sea instalable
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW error:', err));
  }
});
