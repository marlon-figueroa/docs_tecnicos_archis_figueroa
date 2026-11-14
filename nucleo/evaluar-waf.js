import { cargarCatalogos } from './catalogos-store.js';
import { PILARES } from './esquema.js';

/**
 * Inicializa matriz de evaluación si está vacía
 */
export function inicializarEvaluacion(doc) {
  const proveedor =
    doc.evaluacionWellArchitected?.proveedorEvaluado ||
    (doc.meta.proveedorNube === 'azure' ? 'azure' : 'aws');
  const plantilla =
    proveedor === 'azure'
      ? cargarCatalogos().controlesWaf.azure
      : cargarCatalogos().controlesWaf.aws;

  const existentes = doc.evaluacionWellArchitected?.pilares || [];
  const byPilar = new Map(existentes.map((p) => [p.pilar, p]));

  const pilares = plantilla.map((bloque) => {
    const prev = byPilar.get(bloque.pilar);
    if (prev?.controles?.length) return prev;
    return {
      pilar: bloque.pilar,
      controles: bloque.controles.map((c) => ({
        id: c.id,
        texto: c.texto,
        estado: 'no-aplica',
        evidencia: '',
        brecha: '',
      })),
    };
  });

  doc.evaluacionWellArchitected = {
    proveedorEvaluado: proveedor,
    pilares,
  };
  return doc;
}

export function resumenEvaluacion(doc) {
  const pilares = doc.evaluacionWellArchitected?.pilares || [];
  let cumple = 0;
  let parcial = 0;
  let brecha = 0;
  let noAplica = 0;
  const brechasCriticas = [];

  for (const p of pilares) {
    for (const c of p.controles || []) {
      if (c.estado === 'cumple') cumple++;
      else if (c.estado === 'parcial') parcial++;
      else if (c.estado === 'brecha') {
        brecha++;
        brechasCriticas.push({ pilar: p.pilar, control: c.id, texto: c.texto, brecha: c.brecha });
      } else noAplica++;
    }
  }

  return { cumple, parcial, brecha, noAplica, brechasCriticas };
}

export function buenasPracticasParaDocumento(doc) {
  const prov = doc.evaluacionWellArchitected?.proveedorEvaluado || 'aws';
  const key = prov === 'azure' ? 'azure' : 'aws';
  return cargarCatalogos().buenasPracticas[key];
}