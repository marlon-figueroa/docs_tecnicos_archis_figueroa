import { servicioPorId } from './catalogos-store.js';
import { buenasPracticasParaDocumento, resumenEvaluacion } from './evaluar-waf.js';
import { PILARES } from './esquema.js';

function mdList(items) {
  if (!items?.length) return '_Sin contenido_\n';
  return items.map((i) => `- ${i}`).join('\n') + '\n';
}

function mdEscenariosCalidad(list) {
  if (!list?.length) return '_Sin escenarios_\n';
  return list
    .map(
      (e) =>
        `### ${e.nombre || 'Escenario'}\n- **Estímulo:** ${e.estimulo}\n- **Respuesta:** ${e.respuesta}\n- **Medida:** ${e.medida}\n`
    )
    .join('\n');
}

function mermaidContexto(doc) {
  const actores = doc.arc42?.contexto?.actores || [];
  const sistema = doc.meta?.nombreProyecto || 'Sistema';
  const lines = ['flowchart LR'];
  const sysId = 'sys';
  lines.push(`  ${sysId}[${sistema.replace(/[[\]]/g, '')}]`);
  actores.forEach((a, i) => {
    const id = `actor${i}`;
    const nombre = (a.nombre || a).replace(/"/g, "'");
    lines.push(`  ${id}["${nombre}"]`);
    lines.push(`  ${id} --> ${sysId}`);
  });
  return '```mermaid\n' + lines.join('\n') + '\n```\n';
}

function mermaidBloquesC4(doc) {
  const bloques = (doc.arc42?.bloques || []).filter((b) => (b.nombre || '').trim());
  if (!bloques.length) return '';
  const lines = ['flowchart TB'];
  bloques.forEach((b, i) => {
    const nombre = (b.nombre || `Bloque ${i + 1}`).replace(/"/g, "'").replace(/[[\]]/g, '');
    lines.push(`  b${i}["${nombre}"]`);
  });
  for (let i = 0; i < bloques.length - 1; i++) {
    lines.push(`  b${i} --> b${i + 1}`);
  }
  return '```mermaid\n' + lines.join('\n') + '\n```\n';
}

function mermaidDespliegue(doc) {
  const prov = doc.meta?.proveedorNube || 'aws';
  const servicios = (doc.nube?.serviciosSeleccionados || [])
    .map(servicioPorId)
    .filter(Boolean)
    .slice(0, 8);
  const lines = ['flowchart TB', `  subgraph nube [${prov.toUpperCase()}]`];
  servicios.forEach((s, i) => {
    lines.push(`    s${i}[${s.nombre}]`);
  });
  lines.push('  end');
  return '```mermaid\n' + lines.join('\n') + '\n```\n';
}

function renderAdr(d) {
  return `### ${d.id || 'ADR'} — ${d.titulo}\n\n- **Estado:** ${d.estado || 'propuesto'}\n- **Contexto:** ${d.contexto}\n- **Decisión:** ${d.decision}\n- **Consecuencias:** ${d.consecuencias}\n`;
}

function renderWaf(doc) {
  const res = resumenEvaluacion(doc);
  let out = `**Resumen:** cumple ${res.cumple}, parcial ${res.parcial}, brecha ${res.brecha}, no aplica ${res.noAplica}\n\n`;
  for (const p of doc.evaluacionWellArchitected?.pilares || []) {
    out += `#### ${p.pilar}\n`;
    for (const c of p.controles || []) {
      out += `- **${c.id}** (${c.estado}): ${c.texto}`;
      if (c.evidencia) out += ` — Evidencia: ${c.evidencia}`;
      if (c.brecha) out += ` — Brecha: ${c.brecha}`;
      out += '\n';
    }
    out += '\n';
  }
  return out;
}

function renderBuenasPracticas(doc) {
  const bp = buenasPracticasParaDocumento(doc);
  let out = '';
  for (const pilar of PILARES) {
    const items = bp[pilar];
    if (!items) continue;
    out += `#### ${pilar}\n${mdList(items)}`;
  }
  return out;
}

/**
 * @param {object} doc
 * @returns {string}
 */
export function renderArc42Markdown(doc) {
  const a = doc.arc42;
  const nombre = doc.meta?.nombreProyecto || 'Proyecto';
  const sections = [];

  sections.push(`# arc42 — ${nombre}\n`);
  sections.push(`_Generado: ${doc.meta?.fecha || ''} · Proveedor: ${doc.meta?.proveedorNube}_\n`);

  sections.push(`## 1. Introducción y objetivos\n\n### Visión\n${a.introduccion?.vision || ''}\n\n### Metas\n${mdList(a.introduccion?.metas)}\n### Stakeholders\n${mdList(a.introduccion?.stakeholders?.map((s) => (typeof s === 'string' ? s : `${s.rol}: ${s.nombre}`)))}`);

  sections.push(`## 2. Restricciones\n${mdList(a.restricciones)}`);

  sections.push(`## 3. Contexto y alcance\n\n${mermaidContexto(doc)}\n\n### Actores\n${mdList(a.contexto?.actores?.map((x) => x.nombre || x))}\n### Sistemas externos\n${mdList(a.contexto?.sistemasExternos?.map((x) => x.nombre || x))}\n### Relaciones\n${mdList(a.contexto?.relaciones)}`);

  sections.push(`## 4. Estrategia de solución\n${a.estrategia?.resumen || ''}\n\n${mdList(a.estrategia?.decisionesClave)}`);

  sections.push(
    `## 5. Vista de bloques (C4 contenedores)\n\n${mermaidBloquesC4(doc)}\n\n${(a.bloques || []).map((b) => `### ${b.nombre}\n- **Responsabilidad:** ${b.responsabilidad}\n- **Tecnología:** ${b.tecnologia || '—'}\n`).join('\n')}`
  );

  sections.push(`## 6. Vista de ejecución\n\n${(a.escenariosEjecucion || []).map((e) => `### ${e.nombre}\n${e.descripcion}\n`).join('\n') || '_Sin escenarios_'}\n`);

  sections.push(`## 7. Vista de despliegue\n\n${mermaidDespliegue(doc)}\n\n${a.despliegue?.topologia || ''}\n\n${a.despliegue?.notas || ''}\n`);

  sections.push(`## 8. Conceptos transversales\n${mdList(a.conceptosTransversales)}`);

  sections.push(`## 9. Decisiones de arquitectura\n\n${(a.decisiones || []).map(renderAdr).join('\n') || '_Sin ADRs_'}\n`);

  sections.push(`## 10. Requisitos de calidad\n\n${mdEscenariosCalidad(a.escenariosCalidad)}`);

  sections.push(`## 11. Riesgos y deuda técnica\n\n${(a.riesgos || []).map((r) => {
    const causa = r.causa ? ` Causa: ${r.causa}.` : '';
    const control = r.relacionControl ? ` (control: ${r.relacionControl})` : '';
    return `- **${r.titulo}** (${r.severidad || 'media'}): ${r.descripcion || ''}${causa}${control}`;
  }).join('\n') || '_Sin riesgos_'}\n`);

  sections.push(`## 12. Glosario\n${mdList(a.glosario || [])}`);

  sections.push(`---\n\n## Anexo: Servicios de nube\n\n${(doc.nube?.serviciosSeleccionados || []).map((id) => {
    const s = servicioPorId(id);
    return s ? `- ${s.nombre} (${s.capacidad})` : `- ${id}`;
  }).join('\n')}\n`);

  sections.push(`## Anexo: Patrones y antipatrones\n\n### Patrones\n${(doc.patrones || []).map((p) => `- **${p.nombre || p.id}** [${p.estado}]: ${p.motivo || ''}`).join('\n') || '_Ninguno_'}\n\n### Antipatrones\n${(doc.antipatrones || []).map((an) => `- **${an.nombre || an.id}** [${an.estado}]: ${an.mitigacion || ''}`).join('\n') || '_Ninguno_'}\n`);

  sections.push(`## Anexo: Evaluación Well-Architected (${doc.evaluacionWellArchitected?.proveedorEvaluado || 'aws'})\n\n${renderWaf(doc)}`);

  sections.push(`## Anexo: Buenas prácticas de mercado (referencia)\n\n${renderBuenasPracticas(doc)}`);

  return sections.join('\n');
}