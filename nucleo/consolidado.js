import { servicioPorId } from './catalogos-store.js';
import { resumenEvaluacion } from './evaluar-waf.js';
import { validarDocumento } from './validar.js';
import { CAPACIDADES } from './esquema.js';

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

const PERFIL_KEYS = [
  ['cargaVariable', 'Carga variable'],
  ['tareasCortas', 'Tareas cortas'],
  ['datosTransaccionales', 'Datos transaccionales'],
  ['modeloRelacional', 'Modelo relacional'],
  ['multiplesClientes', 'Múltiples clientes'],
  ['picosCarga', 'Picos de carga'],
  ['integracionEventos', 'Integración por eventos'],
  ['lecturasIntensivas', 'Lecturas intensivas'],
  ['usuariosExternos', 'Usuarios externos'],
  ['almacenamientoObjetos', 'Almacenamiento de objetos'],
  ['estiloMicroservicios', 'Estilo microservicios'],
  ['sistemaLegado', 'Sistema legado'],
  ['rtoHorasMenor24', 'RTO < 24 h'],
  ['slaOperativo', 'SLA operativo'],
  ['contenedores', 'Contenedores'],
];

function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** html2canvas no dibuja el espacio normal ni un span vacío; el espacio de no separación sí tiene ancho. */
function spaceFix(html) {
  return html.replace(/>([^<]+)</g, (_, text) => {
    const trimmed = text.replace(/\s+/g, ' ').trim();
    if (!trimmed) return '><';
    return `>${trimmed.replace(/ /g, '&nbsp;<wbr>')}<`;
  });
}

function labelPilar(id) {
  return id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function clip(text, max) {
  const value = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

function row(cells) {
  return `<tr>${cells.map((cell) => `<td><span class="v">${cell}</span></td>`).join('')}</tr>`;
}

function dataTable(headers, rows, extraClass = '') {
  const head = `<thead><tr>${headers.map((h) => `<th><span class="v">${esc(h)}</span></th>`).join('')}</tr></thead>`;
  const body = rows.length
    ? `<tbody>${rows.join('')}</tbody>`
    : `<tbody><tr><td colspan="${headers.length}"><span class="v">—</span></td></tr></tbody>`;
  return `<div class="data-frame"><table class="data ${extraClass}">${head}${body}</table></div>`;
}

/** El margen del título no llega al lienzo; un bloque con alto fijo sí. */
function titled(title, tableHtml) {
  return `<div class="dash-block"><h3>${esc(title)}</h3><p class="dash-gap">&nbsp;</p>${tableHtml}</div>`;
}

function pairRow(left, right) {
  return `<table class="pair"><tr><td>${left}</td><td>${right}</td></tr></table>`;
}

function collectDashboardData(doc) {
  const meta = doc.meta || {};
  const arc = doc.arc42 || {};
  const validation = validarDocumento(doc);
  const evalResumen = resumenEvaluacion(doc);

  const vision = arc.introduccion?.vision?.trim() || '';
  const metas = (arc.introduccion?.metas || []).map((m) => String(m).trim()).filter(Boolean);
  const restricciones = (arc.restricciones || []).map((r) => String(r).trim()).filter(Boolean);
  const escenarios = (arc.escenariosCalidad || []).filter((e) => e?.nombre?.trim());
  const bloques = (arc.bloques || []).filter((b) => b.nombre?.trim());
  const adrs = (arc.decisiones || []).filter((d) => d.titulo?.trim() || d.id?.trim());
  const riesgos = arc.riesgos || [];
  const patrones = doc.patrones || [];
  const antipatrones = doc.antipatrones || [];
  const svcIds = doc.nube?.serviciosSeleccionados || [];
  const adoptados = patrones.filter((p) => p.estado === 'adoptado').length;
  const wafTotal = evalResumen.cumple + evalResumen.parcial + evalResumen.brecha + evalResumen.noAplica;
  const wafEvaluados = evalResumen.cumple + evalResumen.parcial + evalResumen.brecha;
  const wafPct = wafEvaluados > 0 ? Math.round((evalResumen.cumple / wafEvaluados) * 100) : null;
  const ctx = doc.contextoNegocio || {};
  const perfilLabels = PERFIL_KEYS.filter(([k]) => ctx[k]).map(([, label]) => label);
  const servicios = svcIds.map((id) => servicioPorId(id)).filter(Boolean);
  const porCap = new Map();
  for (const s of servicios) {
    const cap = s.capacidad || 'otros';
    const list = porCap.get(cap) || [];
    list.push(s);
    porCap.set(cap, list);
  }
  const riesgoAlto = riesgos.filter((r) => r.severidad === 'alta' || r.severidad === 'critica').length;
  const adrAceptados = adrs.filter((a) => a.estado === 'aceptada' || a.estado === 'aceptado').length;
  const entornos = (arc.despliegue?.entornos || []).filter(Boolean);

  return {
    meta,
    arc,
    validation,
    evalResumen,
    vision,
    metas,
    restricciones,
    escenarios,
    bloques,
    adrs,
    riesgos,
    patrones,
    antipatrones,
    svcIds,
    adoptados,
    wafTotal,
    wafPct,
    perfilLabels,
    porCap,
    riesgoAlto,
    adrAceptados,
    entornos,
  };
}

/**
 * HTML del tablero (cuadros de contadores y paneles) para PDF del consolidado.
 * @param {object} doc
 * @returns {string}
 */
export function renderConsolidadoHtml(doc) {
  const d = collectDashboardData(doc);
  const nombre = d.meta.nombreProyecto?.trim() || 'Proyecto sin nombre';
  const proveedor = d.meta.proveedorNube || 'aws';
  const proveedorNombre = PROVEEDORES[proveedor] || proveedor;
  const fecha = d.meta.fecha || '—';
  const autor = d.meta.autor?.trim() || '';

  const portada = `<section class="cover">
  <p class="cover-kicker">Tablero de control</p>
  <h1>${esc(nombre)}</h1>
  <div class="cover-rule"></div>
  <p class="cover-meta">${esc(proveedorNombre)}</p>
  <p class="cover-meta">Fecha: ${esc(fecha)}${autor ? ` · Autor: ${esc(autor)}` : ''}</p>
  <p class="cover-meta">Consolidado en tablas (indicadores, alcance, servicios y riesgos)</p>
</section>`;

  const badgeText = d.validation.valido
    ? 'Sin errores bloqueantes'
    : `${d.validation.errores.length} errores, ${d.validation.advertencias.length} avisos`;

  const indicadores = dataTable(
    ['Indicador', 'Valor', 'Detalle'],
    [
      row([esc('Servicios'), esc(String(d.svcIds.length)), esc(`${d.porCap.size} capacidades`)]),
      row([
        esc('Patrones'),
        esc(String(d.patrones.length)),
        esc(d.adoptados > 0 ? `${d.adoptados} adoptados` : 'Sin adoptar'),
      ]),
      row([
        esc('ADRs y riesgos'),
        esc(`${d.adrs.length} / ${d.riesgos.length}`),
        esc(d.riesgoAlto > 0 ? `${d.riesgoAlto} alto o crítico` : 'Sin riesgo alto'),
      ]),
      row([
        esc('Well-Architected'),
        esc(d.wafPct !== null ? `${d.wafPct}% cumple` : '—'),
        esc(
          d.wafTotal > 0
            ? `${d.evalResumen.brecha} brechas, ${d.evalResumen.parcial} parciales`
            : 'Sin evaluar',
        ),
      ]),
    ],
    'cols-3',
  );

  const alcance = dataTable(
    ['Concepto', 'Detalle'],
    [
      row([esc('Visión'), esc(d.vision ? clip(d.vision, 160) : 'Sin visión')]),
      row([esc('Metas'), esc(String(d.metas.length))]),
      row([esc('Restricciones'), esc(String(d.restricciones.length))]),
      row([
        esc('Rasgos'),
        esc(d.perfilLabels.length ? d.perfilLabels.slice(0, 8).join(', ') : 'Ninguno'),
      ]),
    ],
  );

  const bloquesRows = d.bloques.slice(0, 6).map((b) =>
    row([esc(b.nombre), esc(b.tecnologia ? clip(b.tecnologia, 48) : '—')]),
  );
  if (d.bloques.length > 6) bloquesRows.push(row([esc('Otros'), esc(`+${d.bloques.length - 6}`)]));
  const bloques = dataTable(['Bloque', 'Tecnología'], bloquesRows);

  const servicioRows = [];
  for (const cap of [...CAPACIDADES, 'otros']) {
    const items = d.porCap.get(cap);
    if (!items?.length) continue;
    const shown = items.slice(0, 6).map((s) => s.nombre);
    const extra = items.length > shown.length ? ` (+${items.length - shown.length})` : '';
    servicioRows.push(row([esc(CAP_LABELS[cap] || cap), esc(shown.join(', ') + extra)]));
  }
  const servicios = dataTable(['Capacidad', 'Servicios'], servicioRows);

  const patronRows = d.patrones.slice(0, 8).map((p) => row([esc(clip(p.nombre, 42)), esc(p.estado || 'sugerido')]));
  if (d.patrones.length > 8) patronRows.push(row([esc('Otros patrones'), esc(`+${d.patrones.length - 8}`)]));
  const antiRows = d.antipatrones.slice(0, 5).map((a) => row([esc(clip(a.nombre, 42)), esc('advertencia')]));
  if (d.antipatrones.length > 5) antiRows.push(row([esc('Otros antipatrones'), esc(`+${d.antipatrones.length - 5}`)]));
  const patrones = dataTable(['Patrón o antipatrón', 'Estado'], [...patronRows, ...antiRows]);

  const waf = dataTable(
    ['Estado', 'Cantidad'],
    [
      row([esc('Cumple'), esc(String(d.evalResumen.cumple))]),
      row([esc('Parcial'), esc(String(d.evalResumen.parcial))]),
      row([esc('Brecha'), esc(String(d.evalResumen.brecha))]),
      row([esc('No aplica'), esc(String(d.evalResumen.noAplica))]),
      ...d.evalResumen.brechasCriticas.slice(0, 3).map((b) => row([esc(labelPilar(b.pilar)), esc(b.control)])),
    ],
  );

  const riesgoRows = d.riesgos.slice(0, 5).map((r) => row([esc(r.severidad || '—'), esc(clip(r.titulo || 'Sin título', 48))]));
  if (d.riesgos.length > 5) riesgoRows.push(row([esc('Otros'), esc(`+${d.riesgos.length - 5}`)]));
  if (d.entornos.length) riesgoRows.unshift(row([esc('Entornos'), esc(clip(d.entornos.join(', '), 60))]));
  riesgoRows.unshift(row([esc('ADRs'), esc(d.adrAceptados ? `${d.adrs.length} (${d.adrAceptados} aceptadas)` : String(d.adrs.length))]));
  const riesgos = dataTable(['Tipo', 'Detalle'], riesgoRows);

  const tablero = `<section class="dashboard-landscape" aria-label="Tablero de control">
    <div class="dash-block">
      <p class="dash-kicker">TABLERO&nbsp;DE&nbsp;CONTROL</p>
      <h2 class="dash-title">${esc(nombre)}</h2>
      <p class="dash-meta">${esc(proveedorNombre)} · ${esc(fecha)}${autor ? ` · ${esc(autor)}` : ''} · ${esc(badgeText)}</p>
    </div>
    ${titled('Indicadores', indicadores)}
    ${pairRow(titled('Alcance', alcance), `${titled('Bloques', bloques)}<p class="dash-meta">${esc(d.escenarios.length)} escenarios de calidad</p>`)}
    ${pairRow(titled('Servicios', servicios), titled('Patrones', patrones))}
    ${pairRow(titled('Well-Architected', waf), titled('Decisiones y riesgos', riesgos))}
  </section>`;

  return spaceFix(`${portada}${tablero}`);
}

/** @deprecated usar renderConsolidadoHtml */
export function renderConsolidadoMarkdown(doc) {
  return renderConsolidadoHtml(doc);
}