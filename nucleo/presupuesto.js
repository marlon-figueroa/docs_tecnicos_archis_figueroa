import { CAPACIDADES } from './esquema.js';
import { cargarCatalogos, servicioPorId } from './catalogos-store.js';

const CAP_LABELS = {
  compute: 'Cómputo',
  integracion: 'Integración',
  datos: 'Datos',
  identidad: 'Identidad',
  red: 'Red',
  seguridad: 'Seguridad',
  observabilidad: 'Observabilidad',
};

const PROVEEDORES = {
  aws: 'Amazon Web Services',
  azure: 'Microsoft Azure',
  hibrido: 'Híbrido AWS y Azure',
};

function money(n) {
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}

function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function texto(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n+/g, ' ')
    .trim();
}

function costoPorServicio(id) {
  const partidas = cargarCatalogos().costos?.partidas || [];
  return partidas.find((p) => p.servicioId === id) || null;
}

function referenciasProveedor(proveedor) {
  if (proveedor === 'azure') {
    return [
      'Marco Microsoft Azure Well-Architected, pilar de optimización de costos: https://learn.microsoft.com/azure/well-architected/cost-optimization/',
      'Lista pública de precios de Azure (Azure Pricing Calculator): https://azure.microsoft.com/pricing/calculator/ — este documento no la consulta.',
    ];
  }
  if (proveedor === 'hibrido') {
    return [
      'Marco AWS Well-Architected, pilar de optimización de costos: https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html',
      'Marco Microsoft Azure Well-Architected, pilar de optimización de costos: https://learn.microsoft.com/azure/well-architected/cost-optimization/',
      'Listas públicas de precios de AWS (https://aws.amazon.com/pricing/) y de Azure (https://azure.microsoft.com/pricing/calculator/). Este documento no las consulta.',
    ];
  }
  return [
    'Marco AWS Well-Architected, pilar de optimización de costos: https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html',
    'Lista pública de precios de AWS: https://aws.amazon.com/pricing/ — este documento no la consulta.',
  ];
}

/**
 * Presupuesto de referencia a partir de los servicios seleccionados y el catálogo de costos.
 * El Markdown incluye la estructura mínima del PDF: portada, índice, introducción,
 * objetivos, contenido, glosario y referencias.
 * @param {object} doc
 * @returns {string}
 */
export function renderPresupuestoMarkdown(doc) {
  const cat = cargarCatalogos().costos || {};
  const moneda = cat.moneda || 'USD';
  const nombre = doc.meta?.nombreProyecto?.trim() || 'Proyecto';
  const proveedor = doc.meta?.proveedorNube || 'aws';
  const proveedorNombre = PROVEEDORES[proveedor] || proveedor;
  const fecha = doc.meta?.fecha || '—';
  const autor = doc.meta?.autor?.trim() || 'Sin autor indicado';
  const perfil = cat.perfil || 'Referencia';
  const vigencia = cat.vigencia || '—';
  const nota = cat.nota || 'Importes de referencia. No constituyen cotización.';
  const vision = doc.arc42?.introduccion?.vision?.trim() || '';
  const metas = (doc.arc42?.introduccion?.metas || []).map((m) => String(m).trim()).filter(Boolean);
  const ids = doc.nube?.serviciosSeleccionados || [];

  const lineas = ids.map((id) => {
    const servicio = servicioPorId(id);
    const costo = costoPorServicio(id);
    return {
      id,
      nombre: servicio?.nombre || id,
      capacidad: servicio?.capacidad || 'otros',
      supuesto: costo?.supuesto || 'Sin supuesto en el catálogo',
      mensual: costo ? Number(costo.costoMensualUsd) || 0 : null,
    };
  });

  const grupos = new Map();
  for (const linea of lineas) {
    const list = grupos.get(linea.capacidad) || [];
    list.push(linea);
    grupos.set(linea.capacidad, list);
  }

  const orden = [...CAPACIDADES, 'otros'];
  const secciones = [];
  const entradasIndice = [];
  let total = 0;
  let sinTarifa = 0;

  for (const cap of orden) {
    const items = grupos.get(cap);
    if (!items?.length) continue;
    const titulo = CAP_LABELS[cap] || cap;
    const ancla = `contenido-${cap}`;
    entradasIndice.push({ ancla, titulo });
    let sub = 0;
    const rows = items
      .map((item) => {
        if (item.mensual == null) {
          sinTarifa += 1;
          return `| ${texto(item.nombre)} | ${texto(item.supuesto)} | — |`;
        }
        sub += item.mensual;
        return `| ${texto(item.nombre)} | ${texto(item.supuesto)} | ${money(item.mensual)} |`;
      })
      .join('\n');
    total += sub;
    secciones.push(
      [
        `<h3 id="${ancla}">${esc(titulo)}</h3>`,
        '',
        `| Servicio | Supuesto del catálogo | Mensual (${moneda}) |`,
        '| --- | --- | ---: |',
        rows,
        '',
        `**Subtotal:** ${money(sub)} ${moneda}`,
        '',
      ].join('\n')
    );
  }

  const anual = total * 12;
  const conTarifa = lineas.length - sinTarifa;
  const contenidoVacio = lineas.length === 0;

  const portada = `<section class="cover">
  <p class="cover-kicker">Presupuesto de referencia</p>
  <h1>${esc(nombre)}</h1>
  <div class="cover-rule"></div>
  <p class="cover-meta">${esc(proveedorNombre)}</p>
  <p class="cover-meta">Fecha: ${esc(fecha)} · Autor: ${esc(autor)}</p>
  <p class="cover-meta">Moneda: ${esc(moneda)} · Perfil: ${esc(perfil)}</p>
  <p class="cover-meta">Vigencia del catálogo: ${esc(vigencia)}</p>
  <p class="cover-note">${esc(nota)}</p>
</section>`;

  const indiceItems = [
    '<li><a href="#introduccion">Introducción</a></li>',
    '<li><a href="#objetivos">Objetivos</a></li>',
    '<li><a href="#contenido">Contenido</a>',
    entradasIndice.length
      ? `<ol>${entradasIndice.map((e) => `<li><a href="#${e.ancla}">${esc(e.titulo)}</a></li>`).join('')}<li><a href="#resumen">Resumen</a></li></ol>`
      : '',
    '</li>',
    '<li><a href="#glosario">Glosario</a></li>',
    '<li><a href="#referencias">Referencias</a></li>',
  ].join('');

  const indice = `<nav class="toc" aria-label="Índice">
  <h2 id="indice" class="toc-title">Índice</h2>
  <ol>
    ${indiceItems}
  </ol>
</nav>`;

  const introVision = vision
    ? `La arquitectura describe esta visión: ${texto(vision)}`
    : 'La estimación acompaña a la arquitectura registrada en el asistente.';

  const introduccion = [
    '<h2 id="introduccion" class="chapter">Introducción</h2>',
    '',
    `Este documento estima el costo de los servicios de nube seleccionados para **${texto(nombre)}**.`,
    '',
    introVision,
    '',
    `El alcance son ${lineas.length} servicio${lineas.length === 1 ? '' : 's'} de **${texto(proveedorNombre)}**, valorados con el perfil «${texto(perfil)}» del catálogo interno vigente en ${texto(vigencia)}. Cada partida usa el supuesto de uso definido en ese catálogo.`,
    '',
    texto(nota),
    '',
    'Quedan fuera del total el crecimiento de la demanda, los descuentos comerciales, los impuestos y la transferencia de datos que no esté descrita en el supuesto de cada partida.',
    '',
  ].join('\n');

  const metasBloque = metas.length
    ? ['', 'Metas del proyecto que enmarcan esta estimación:', '', ...metas.map((m) => `- ${texto(m)}`), ''].join('\n')
    : '';

  const objetivos = [
    '<h2 id="objetivos" class="chapter">Objetivos</h2>',
    '',
    '1. Cuantificar el costo mensual y el costo anual de la selección actual de servicios.',
    '2. Dejar explícito el supuesto de uso de cada partida.',
    '3. Agrupar el gasto por capacidad para distinguir cómputo, datos, integración, red, seguridad, identidad y observabilidad.',
    '4. Ofrecer una línea base de costos para revisar la arquitectura. No sustituye una cotización del proveedor.',
    metasBloque,
  ].join('\n');

  const cuerpo = contenidoVacio
    ? '_No hay servicios de nube seleccionados. El total permanece en cero hasta que se elijan componentes en el paso de nube._\n'
    : secciones.join('\n');

  const contenido = [
    '<h2 id="contenido" class="chapter">Contenido</h2>',
    '',
    cuerpo,
    '<h3 id="resumen">Resumen</h3>',
    '',
    `| Concepto | Importe (${moneda}) |`,
    '| --- | ---: |',
    `| Servicios con tarifa | ${conTarifa} |`,
    `| Servicios sin tarifa en catálogo | ${sinTarifa} |`,
    `| **Total mensual** | **${money(total)}** |`,
    `| **Total anual (× 12)** | **${money(anual)}** |`,
    '',
    `El total anual de ${money(anual)} ${moneda} multiplica el mensual por doce. No incluye crecimiento, descuentos, impuestos ni transferencia de datos fuera de los supuestos.`,
    '',
  ].join('\n');

  const glosario = `<h2 id="glosario" class="chapter">Glosario</h2>

<dl class="glossary">
  <dt>Partida</dt>
  <dd>Línea del presupuesto que corresponde a un servicio de nube seleccionado.</dd>
  <dt>Supuesto de uso</dt>
  <dd>Volumen, tamaño o nivel de servicio con el que el catálogo calcula el importe mensual.</dd>
  <dt>Capacidad</dt>
  <dd>Agrupación del servicio: cómputo, integración, datos, identidad, red, seguridad u observabilidad.</dd>
  <dt>Tarifa de referencia</dt>
  <dd>Importe mensual del catálogo interno. No es un precio oficial de AWS ni de Azure.</dd>
  <dt>Servicio sin tarifa</dt>
  <dd>Servicio seleccionado que no tiene partida en el catálogo. No suma al total.</dd>
  <dt>Total mensual</dt>
  <dd>Suma de las tarifas de referencia de las partidas con importe.</dd>
  <dt>Total anual</dt>
  <dd>Total mensual multiplicado por doce, sin estacionalidad ni descuentos.</dd>
  <dt>${esc(moneda)}</dt>
  <dd>Moneda del catálogo. Los importes se muestran con dos decimales.</dd>
</dl>`;

  const refs = [
    `Catálogo interno de costos de nube, vigencia ${texto(vigencia)}, perfil «${texto(perfil)}». Fuente: catalogos/costos-nube.json.`,
    texto(nota),
    `Arquitectura del proyecto «${texto(nombre)}», fecha ${texto(fecha)}, autor ${texto(autor)}.`,
    ...referenciasProveedor(proveedor),
  ];

  const referencias = [
    '<h2 id="referencias" class="chapter">Referencias</h2>',
    '',
    ...refs.map((r, i) => `${i + 1}. ${r}`),
    '',
  ].join('\n');

  return [portada, '', indice, '', introduccion, objetivos, contenido, glosario, '', referencias].join('\n');
}
