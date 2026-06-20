/* ===================================================================
   DATA.JS — Datos simulados de RifaFiesta
   --------------------------------------------------------------
   Cuando conectes Supabase, este archivo se reemplaza por funciones
   async que hacen fetch a tus tablas reales. La forma de cada objeto
   (los nombres de campo) está pensada para mapear 1 a 1 con columnas
   de una tabla "sorteos" y "boletos" en Supabase, así el resto del
   código (app.js) casi no cambia.

   Ejemplo de cómo se vería en Supabase más adelante:
     const { data } = await supabase.from('sorteos').select('*')
   ================================================================ */

const SORTEOS = [
  {
    id: "sj-2026",
    festividad: "Fiesta de San Juan",
    region: "Ucayali",
    emoji_fest: "🌊",
    titulo: "Gran Sorteo San Juan Bautista",
    premio_nombre: "Moto Honda CB150",
    premio_valor: 8500,
    premio_emoji: "🏍️",
    tema: "moto",
    descripcion: "Para celebrar la fiesta más importante de la Amazonía peruana, sorteamos una moto 0KM. El ganador se elige en vivo con presencia de notario público.",
    precio_boleto: 10,
    total_boletos: 500,
    fecha_sorteo: "2026-06-24T20:00:00",
    destacado: true,
    badge: "Más vendido",
    categoria: "san-juan"
  },
  {
    id: "fp-2026",
    festividad: "Fiestas Patrias",
    region: "Nacional",
    emoji_fest: "🇵🇪",
    titulo: "Sorteo 28 de Julio — Edición Especial",
    premio_nombre: 'Smart TV 55" + S/500 en efectivo',
    premio_valor: 3200,
    premio_emoji: "📺",
    tema: "tv",
    descripcion: "Celebra la independencia del Perú con este combo: un Smart TV de 55 pulgadas más quinientos soles en efectivo directo a tu cuenta.",
    precio_boleto: 15,
    total_boletos: 500,
    fecha_sorteo: "2026-07-28T19:00:00",
    destacado: false,
    badge: "Nuevo",
    categoria: "fiestas-patrias"
  },
  {
    id: "ir-2026",
    festividad: "Inti Raymi",
    region: "Cusco",
    emoji_fest: "☀️",
    titulo: "Sorteo del Sol — Fin de semana Inti Raymi",
    premio_nombre: "Viaje para 2 a Machu Picchu",
    premio_valor: 4500,
    premio_emoji: "✈️",
    tema: "viaje",
    descripcion: "Vive la fiesta del sol con un viaje completo para dos personas a Machu Picchu, incluyendo hospedaje y entradas.",
    precio_boleto: 20,
    total_boletos: 500,
    fecha_sorteo: "2026-06-24T18:00:00",
    destacado: false,
    badge: "Últimos boletos",
    categoria: "inti-raymi"
  },
  {
    id: "nav-2026",
    festividad: "Navidad",
    region: "Nacional",
    emoji_fest: "🎄",
    titulo: "Sorteo Navideño RifaFiesta",
    premio_nombre: "Canasta + S/1000 en efectivo",
    premio_valor: 1200,
    premio_emoji: "🎁",
    tema: "navidad",
    descripcion: "El sorteo navideño más esperado del año. Una canasta completa para la familia más mil soles en efectivo.",
    precio_boleto: 8,
    total_boletos: 800,
    fecha_sorteo: "2026-12-24T20:00:00",
    destacado: false,
    badge: "Próximamente",
    categoria: "navidad"
  }
];

// Boletos ya vendidos por sorteo, simulando lo que vendría de una
// tabla "boletos" en Supabase (consulta: SELECT numero FROM boletos WHERE sorteo_id = ...)
const BOLETOS_VENDIDOS = {
  "sj-2026": generarVendidosAleatorios(500, 342),
  "fp-2026": generarVendidosAleatorios(500, 89),
  "ir-2026": generarVendidosAleatorios(500, 478),
  "nav-2026": generarVendidosAleatorios(800, 12)
};

function generarVendidosAleatorios(total, cantidad) {
  const set = new Set();
  while (set.size < cantidad) {
    set.add(Math.floor(Math.random() * total) + 1);
  }
  return set;
}

// Ganadores recientes — simulando tabla "ganadores"
const GANADORES = [
  { nombre: "Carlos M.", premio: "Moto Honda 125cc", ciudad: "Pucallpa", emoji: "🧑" },
  { nombre: "Rosa T.", premio: "Smart TV 43\"", ciudad: "Lima", emoji: "👩" },
  { nombre: "Jorge P.", premio: "S/ 500 en efectivo", ciudad: "Iquitos", emoji: "🧔" },
  { nombre: "Marisol C.", premio: "Viaje a Cusco × 2", ciudad: "Arequipa", emoji: "👧" }
];

// Usuario simulado — luego vendría de Supabase Auth
const USUARIO_ACTUAL = {
  nombre: "Roel",
  telefono: "+51 999 888 777",
  boletos_comprados: []
};

/* ===== FUNCIONES DE ACCESO A DATOS =====
   Estas funciones son las que app.js consume. Cuando migres a
   Supabase, solo reescribes el CUERPO de estas funciones para
   que hagan fetch real — las llamadas desde app.js no cambian. */

function obtenerSorteos() {
  return Promise.resolve(SORTEOS);
}

function obtenerSorteoPorId(id) {
  const sorteo = SORTEOS.find(s => s.id === id);
  return Promise.resolve(sorteo);
}

function obtenerBoletosVendidos(sorteoId) {
  return Promise.resolve(BOLETOS_VENDIDOS[sorteoId] || new Set());
}

function obtenerGanadores() {
  return Promise.resolve(GANADORES);
}

function registrarCompra(sorteoId, numeros, metodoPago) {
  // Simulación: en producción esto sería un insert en Supabase
  // y un llamado a la API de Culqi/Yape.
  numeros.forEach(n => BOLETOS_VENDIDOS[sorteoId].add(n));
  const compra = {
    id: "boleto-" + Date.now(),
    sorteo_id: sorteoId,
    numeros: numeros,
    metodo_pago: metodoPago,
    fecha: new Date().toISOString(),
    estado: "confirmado"
  };
  USUARIO_ACTUAL.boletos_comprados.push(compra);
  return Promise.resolve(compra);
}
