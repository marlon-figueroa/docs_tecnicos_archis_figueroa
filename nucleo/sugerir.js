import { cargarCatalogos, servicioPorId } from './catalogos-store.js';

/**
 * Evalúa reglas contra contextoNegocio del documento
 * @param {object} doc
 */
export function sugerirParaDocumento(doc) {
  const { reglas, patrones, antipatrones } = cargarCatalogos();
  const ctx = doc.contextoNegocio || {};
  const proveedor = doc.meta?.proveedorNube || 'aws';

  const patronIds = new Set();
  const antipatronIds = new Set();
  const servicioIds = new Set();
  const motivos = [];

  for (const regla of reglas) {
    const cond = regla.condicion || {};
    const match = Object.entries(cond).every(([k, v]) => ctx[k] === v);
    if (!match) continue;

    for (const p of regla.patrones || []) patronIds.add(p);
    for (const a of regla.antipatrones || []) antipatronIds.add(a);

    const listaServ =
      proveedor === 'azure'
        ? regla.serviciosAzure
        : proveedor === 'hibrido'
          ? [...(regla.serviciosAws || []), ...(regla.serviciosAzure || [])]
          : regla.serviciosAws;

    for (const s of listaServ || []) servicioIds.add(s);
    motivos.push({ reglaId: regla.id, motivo: regla.motivo });
  }

  const patronesSugeridos = [...patronIds]
    .map((id) => patrones.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => ({ ...p, estado: 'sugerido' }));

  const antipatronesSugeridos = [...antipatronIds]
    .map((id) => antipatrones.find((a) => a.id === id))
    .filter(Boolean)
    .map((a) => ({ ...a, estado: 'advertencia' }));

  const serviciosSugeridos = [...servicioIds]
    .map((id) => servicioPorId(id))
    .filter(Boolean);

  return {
    patrones: patronesSugeridos,
    antipatrones: antipatronesSugeridos,
    servicios: serviciosSugeridos,
    motivos,
  };
}

/**
 * Fusiona sugerencias en el documento (no sobrescribe adopciones explícitas)
 */
export function aplicarSugerencias(doc) {
  const sug = sugerirParaDocumento(doc);
  const existentesPat = new Map((doc.patrones || []).map((p) => [p.id, p]));
  const existentesAnti = new Map((doc.antipatrones || []).map((a) => [a.id, a]));

  for (const p of sug.patrones) {
    if (!existentesPat.has(p.id)) {
      existentesPat.set(p.id, {
        id: p.id,
        nombre: p.nombre,
        estado: 'sugerido',
        motivo: sug.motivos.find((m) => m.reglaId)?.motivo || p.cuando,
      });
    }
  }
  for (const a of sug.antipatrones) {
    if (!existentesAnti.has(a.id)) {
      existentesAnti.set(a.id, {
        id: a.id,
        nombre: a.nombre,
        estado: 'advertencia',
        mitigacion: a.remediacion,
      });
    }
  }

  doc.patrones = [...existentesPat.values()];
  doc.antipatrones = [...existentesAnti.values()];

  const sel = new Set(doc.nube?.serviciosSeleccionados || []);
  for (const s of sug.servicios) {
    if (doc.meta.proveedorNube === 'hibrido' || s.proveedor === doc.meta.proveedorNube) {
      sel.add(s.id);
    }
  }
  doc.nube = doc.nube || {};
  doc.nube.serviciosSeleccionados = [...sel];

  return { documento: doc, sugerencias: sug };
}