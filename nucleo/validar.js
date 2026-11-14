import { servicioPorId } from './catalogos-store.js';
import { PILARES, normalizarProveedor } from './esquema.js';
import { resumenEvaluacion } from './evaluar-waf.js';

/**
 * @param {object} doc
 * @returns {{ valido: boolean, errores: string[], advertencias: string[] }}
 */
export function validarDocumento(doc) {
  const errores = [];
  const advertencias = [];
  const a = doc.arc42 || {};

  if (!doc.meta?.nombreProyecto?.trim()) errores.push('Falta meta.nombreProyecto');
  const prov = normalizarProveedor(doc.meta?.proveedorNube);
  if (!['aws', 'azure', 'hibrido'].includes(prov)) errores.push('meta.proveedorNube inválido');

  if (!a.introduccion?.vision?.trim()) errores.push('Falta arc42.introduccion.vision');
  if (!Array.isArray(a.contexto?.actores) || a.contexto.actores.length === 0) {
    errores.push('Debe haber al menos un actor en arc42.contexto.actores');
  }

  const escenarios = a.escenariosCalidad || [];
  if (escenarios.length === 0) {
    errores.push('Al menos un escenario de calidad en arc42.escenariosCalidad');
  } else {
    for (const [i, e] of escenarios.entries()) {
      if (!e.estimulo || !e.respuesta || !e.medida) {
        errores.push(`Escenario de calidad [${i}]: requiere estimulo, respuesta y medida`);
      }
    }
  }

  const bloques = a.bloques || [];
  if (bloques.length === 0) errores.push('Al menos un bloque C4 en arc42.bloques');
  for (const [i, b] of bloques.entries()) {
    if (!b.nombre?.trim() || !b.responsabilidad?.trim()) {
      errores.push(`Bloque [${i}]: requiere nombre y responsabilidad`);
    }
  }

  const servicios = doc.nube?.serviciosSeleccionados || [];
  for (const id of servicios) {
    const s = servicioPorId(id);
    if (!s) {
      errores.push(`Servicio desconocido: ${id}`);
      continue;
    }
    if (prov !== 'hibrido' && s.proveedor !== prov) {
      errores.push(`Servicio ${id} no coincide con proveedor ${prov}`);
    }
  }

  if (prov === 'hibrido') {
    const adrs = a.decisiones || [];
    const justificaHibrido = adrs.some(
      (d) =>
        /hibrid|multi.?nube|azure|aws/i.test(d.titulo + d.contexto + d.decision)
    );
    if (!justificaHibrido) {
      errores.push('Proveedor híbrido requiere un ADR que justifique el cruce AWS/Azure');
    }
  }

  const pilares = doc.evaluacionWellArchitected?.pilares || [];
  if (pilares.length === 0) {
    advertencias.push('Evaluación Well-Architected sin pilares (ejecutar inicializarEvaluacion)');
  } else {
    for (const pilar of PILARES) {
      const bloque = pilares.find((p) => p.pilar === pilar);
      if (!bloque) {
        advertencias.push(`Falta pilar en evaluación: ${pilar}`);
        continue;
      }
      const aplicables = (bloque.controles || []).filter((c) => c.estado !== 'no-aplica');
      if (aplicables.length === 0) {
        advertencias.push(`Pilar ${pilar}: todos los controles en no-aplica`);
      }
    }
  }

  const { brechasCriticas } = resumenEvaluacion(doc);
  const riesgos = a.riesgos || [];
  for (const bc of brechasCriticas) {
    const cubierto = riesgos.some(
      (r) =>
        r.descripcion?.includes(bc.control) ||
        r.causa?.includes(bc.control) ||
        r.relacionControl === bc.control
    );
    if (!cubierto) {
      errores.push(
        `Brecha en control ${bc.control} (${bc.pilar}) sin riesgo asociado en arc42.riesgos`
      );
    }
  }

  return { valido: errores.length === 0, errores, advertencias };
}