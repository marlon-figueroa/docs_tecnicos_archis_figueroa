import { cargarCatalogos, servicioPorId } from './catalogos-store.js';
import { normalizarProveedor } from './esquema.js';
import { resumenEvaluacion } from './evaluar-waf.js';

/**
 * @param {Array<{ id: string, paso: number, nivel: string, mensaje: string }>} lista
 * @param {{ id: string, paso: number, nivel: 'faltante'|'incompleto'|'contenido', mensaje: string }} item
 */
function pushRevision(lista, item) {
  if (lista.some((r) => r.id === item.id)) return;
  lista.push(item);
}

function texto(val) {
  return String(val || '').trim();
}

function medidaObservable(medida) {
  const m = texto(medida);
  if (!m) return false;
  return /\d|%|p\d+|ms|seg|min|hora|\bh\b|segundo|latencia|throughput|usuarios/i.test(m);
}

/**
 * Revisiones de completitud y calidad del contenido por paso del asistente (0–8).
 * @param {object} doc
 * @param {{ patronIds: Set<string>, antipatronIds: Set<string> }} refs
 */
function revisarFormularios(doc, refs) {
  const revisiones = [];
  const a = doc.arc42 || {};
  const prov = normalizarProveedor(doc.meta?.proveedorNube);
  const intro = a.introduccion || {};
  const controlIds = new Set();
  for (const p of doc.evaluacionWellArchitected?.pilares || []) {
    for (const c of p.controles || []) controlIds.add(c.id);
  }

  // Paso 0 — Proyecto y metas
  if (!texto(doc.meta?.nombreProyecto)) {
    pushRevision(revisiones, {
      id: 'meta-nombre',
      paso: 0,
      nivel: 'faltante',
      mensaje: 'Indica el nombre del proyecto; aparece en arc42 y en las exportaciones.',
    });
  }
  if (!texto(intro.vision)) {
    pushRevision(revisiones, {
      id: 'intro-vision',
      paso: 0,
      nivel: 'faltante',
      mensaje: 'Describe la visión: qué problema resuelve el sistema y para quién.',
    });
  } else if (texto(intro.vision).length < 40) {
    pushRevision(revisiones, {
      id: 'intro-vision-corta',
      paso: 0,
      nivel: 'contenido',
      mensaje: 'La visión es muy breve; amplía el contexto del problema y los usuarios.',
    });
  }
  const metas = intro.metas || [];
  if (metas.length === 0) {
    pushRevision(revisiones, {
      id: 'intro-metas',
      paso: 0,
      nivel: 'faltante',
      mensaje: 'Añade al menos una meta medible (una por línea en «Metas»).',
    });
  }
  const stakeholders = intro.stakeholders || [];
  if (stakeholders.length === 0) {
    pushRevision(revisiones, {
      id: 'intro-stakeholders',
      paso: 0,
      nivel: 'incompleto',
      mensaje: 'No hay stakeholders en el documento; conviene listar patrocinador y usuarios clave en arc42.',
    });
  }

  // Paso 1 — Restricciones y contexto
  if ((a.restricciones || []).length === 0) {
    pushRevision(revisiones, {
      id: 'restricciones',
      paso: 1,
      nivel: 'incompleto',
      mensaje: 'Registra restricciones (normativa, presupuesto, plazos) que condicionen el diseño.',
    });
  }
  const actores = a.contexto?.actores || [];
  if (actores.length === 0 || actores.every((x) => !texto(x.nombre))) {
    pushRevision(revisiones, {
      id: 'actores',
      paso: 1,
      nivel: 'faltante',
      mensaje: 'Añade al menos un actor en el contexto del sistema.',
    });
  }
  const externos = a.contexto?.sistemasExternos || [];
  if (externos.length === 0) {
    pushRevision(revisiones, {
      id: 'sistemas-externos',
      paso: 1,
      nivel: 'incompleto',
      mensaje: 'No hay sistemas externos documentados; si integras legados o SaaS, inclúyelos en el JSON o contexto.',
    });
  }
  const ctxKeys = Object.entries(doc.contextoNegocio || {}).filter(([, v]) => v === true);
  if (ctxKeys.length === 0) {
    pushRevision(revisiones, {
      id: 'perfil-negocio',
      paso: 1,
      nivel: 'incompleto',
      mensaje: 'Marca rasgos del perfil de negocio para activar reglas de patrones y servicios.',
    });
  }

  // Paso 2 — Escenarios de calidad
  const escenarios = a.escenariosCalidad || [];
  if (escenarios.length === 0) {
    pushRevision(revisiones, {
      id: 'escenarios-vacio',
      paso: 2,
      nivel: 'faltante',
      mensaje: 'Añade al menos un escenario de calidad con estímulo, respuesta y medida.',
    });
  } else {
    escenarios.forEach((e, i) => {
      if (!texto(e.nombre)) {
        pushRevision(revisiones, {
          id: `escenario-${i}-nombre`,
          paso: 2,
          nivel: 'incompleto',
          mensaje: `Escenario ${i + 1}: falta el nombre.`,
        });
      }
      if (!texto(e.estimulo) || !texto(e.respuesta) || !texto(e.medida)) {
        pushRevision(revisiones, {
          id: `escenario-${i}-campos`,
          paso: 2,
          nivel: 'faltante',
          mensaje: `Escenario ${i + 1}: requiere estímulo, respuesta y medida.`,
        });
      } else if (!medidaObservable(e.medida)) {
        pushRevision(revisiones, {
          id: `escenario-${i}-medida`,
          paso: 2,
          nivel: 'contenido',
          mensaje: `Escenario ${i + 1}: la medida debería ser verificable (número, %, tiempo, latencia).`,
        });
      }
    });
  }

  // Paso 3 — Estrategia y bloques
  if (!texto(a.estrategia?.resumen)) {
    pushRevision(revisiones, {
      id: 'estrategia-resumen',
      paso: 3,
      nivel: 'incompleto',
      mensaje: 'Resume la estrategia de solución (cómo abordas el problema en conjunto).',
    });
  }
  const bloques = a.bloques || [];
  if (bloques.length === 0) {
    pushRevision(revisiones, {
      id: 'bloques-vacio',
      paso: 3,
      nivel: 'faltante',
      mensaje: 'Define al menos un contenedor C4 con nombre y responsabilidad.',
    });
  } else {
    bloques.forEach((b, i) => {
      if (!texto(b.nombre) || !texto(b.responsabilidad)) {
        pushRevision(revisiones, {
          id: `bloque-${i}`,
          paso: 3,
          nivel: 'faltante',
          mensaje: `Contenedor ${i + 1}: requiere nombre y responsabilidad.`,
        });
      }
    });
  }

  // Paso 4 — Ejecución y despliegue
  const ejec = a.escenariosEjecucion || [];
  if (ejec.length === 0) {
    pushRevision(revisiones, {
      id: 'escenarios-ejecucion',
      paso: 4,
      nivel: 'incompleto',
      mensaje: 'No hay escenarios de ejecución en arc42; documenta al menos un flujo operativo si aplica.',
    });
  }
  if (!texto(a.despliegue?.topologia)) {
    pushRevision(revisiones, {
      id: 'despliegue-topologia',
      paso: 4,
      nivel: 'faltante',
      mensaje: 'Describe la topología de despliegue (redes, regiones, entornos).',
    });
  }

  // Paso 5 — Nube
  const servicios = doc.nube?.serviciosSeleccionados || [];
  if (servicios.length === 0) {
    pushRevision(revisiones, {
      id: 'servicios-vacio',
      paso: 5,
      nivel: 'faltante',
      mensaje: 'Selecciona servicios de nube del catálogo para el diseño.',
    });
  }
  for (const id of servicios) {
    const s = servicioPorId(id);
    if (!s) continue;
    if (prov !== 'hibrido' && s.proveedor !== prov) {
      pushRevision(revisiones, {
        id: `servicio-prov-${id}`,
        paso: 5,
        nivel: 'incompleto',
        mensaje: `El servicio ${s.nombre} no corresponde al proveedor ${prov.toUpperCase()}.`,
      });
    }
  }

  // Paso 6 — Patrones
  for (const pid of refs.patronIds) {
    const enDoc = (doc.patrones || []).find((p) => p.id === pid);
    if (!enDoc || enDoc.estado === 'sugerido') {
      const cat = cargarCatalogos().patrones.find((p) => p.id === pid);
      pushRevision(revisiones, {
        id: `patron-${pid}`,
        paso: 6,
        nivel: 'incompleto',
        mensaje: `Patrón recomendado «${cat?.nombre || pid}» aún no está marcado como adoptado.`,
      });
    }
  }
  for (const aid of refs.antipatronIds) {
    const enDoc = (doc.antipatrones || []).find((x) => x.id === aid);
    if (!enDoc) {
      const cat = cargarCatalogos().antipatrones.find((x) => x.id === aid);
      pushRevision(revisiones, {
        id: `antipatron-falta-${aid}`,
        paso: 6,
        nivel: 'incompleto',
        mensaje: `Antipatrón «${cat?.nombre || aid}» aplica a tu perfil; aplica sugerencias o regístralo en patrones.`,
      });
    } else if (enDoc.estado !== 'mitigado' && enDoc.estado !== 'descartado') {
      const cat = cargarCatalogos().antipatrones.find((x) => x.id === aid);
      pushRevision(revisiones, {
        id: `antipatron-${aid}`,
        paso: 6,
        nivel: 'contenido',
        mensaje: `Antipatrón «${cat?.nombre || aid}» sigue abierto; documenta mitigación o márcalo como mitigado.`,
      });
    }
  }

  // Paso 7 — Well-Architected
  const { brechasCriticas } = resumenEvaluacion(doc);
  for (const p of doc.evaluacionWellArchitected?.pilares || []) {
    for (const c of p.controles || []) {
      if (c.estado === 'brecha' && !texto(c.brecha)) {
        pushRevision(revisiones, {
          id: `waf-brecha-texto-${c.id}`,
          paso: 7,
          nivel: 'faltante',
          mensaje: `Control ${c.id}: indica qué falta y cómo se cerrará la brecha.`,
        });
      }
    }
  }
  const riesgos = a.riesgos || [];
  for (const bc of brechasCriticas) {
    if (!texto(bc.brecha)) {
      pushRevision(revisiones, {
        id: `waf-brecha-vacia-${bc.control}`,
        paso: 7,
        nivel: 'faltante',
        mensaje: `Brecha en ${bc.control}: falta descripción de la brecha.`,
      });
    }
    const cubierto = riesgos.some(
      (r) =>
        r.relacionControl === bc.control ||
        texto(r.descripcion).includes(bc.control) ||
        texto(r.causa).includes(bc.control),
    );
    if (!cubierto) {
      pushRevision(revisiones, {
        id: `waf-riesgo-${bc.control}`,
        paso: 7,
        nivel: 'incompleto',
        mensaje: `Brecha en ${bc.control} (${bc.pilar}): registra un riesgo vinculado en «Decisiones y riesgos».`,
      });
    }
  }

  // Paso 8 — ADRs y riesgos
  if (prov === 'hibrido') {
    const adrs = a.decisiones || [];
    const justifica = adrs.some((d) =>
      /hibrid|multi.?nube|azure|aws/i.test(
        `${d.titulo || ''}${d.contexto || ''}${d.decision || ''}`,
      ),
    );
    if (!justifica) {
      pushRevision(revisiones, {
        id: 'adr-hibrido',
        paso: 8,
        nivel: 'faltante',
        mensaje: 'Proveedor híbrido: documenta un ADR que justifique qué carga vive en AWS y en Azure.',
      });
    }
  }
  (a.decisiones || []).forEach((d, i) => {
    const label = d.id || `ADR ${i + 1}`;
    if (!texto(d.titulo)) {
      pushRevision(revisiones, {
        id: `adr-${i}-titulo`,
        paso: 8,
        nivel: 'incompleto',
        mensaje: `${label}: falta el título.`,
      });
    }
    if (!texto(d.contexto)) {
      pushRevision(revisiones, {
        id: `adr-${i}-contexto`,
        paso: 8,
        nivel: 'faltante',
        mensaje: `${label}: falta el contexto de la decisión.`,
      });
    }
    if (!texto(d.decision)) {
      pushRevision(revisiones, {
        id: `adr-${i}-decision`,
        paso: 8,
        nivel: 'faltante',
        mensaje: `${label}: falta la decisión adoptada.`,
      });
    }
    if (!texto(d.consecuencias)) {
      pushRevision(revisiones, {
        id: `adr-${i}-consecuencias`,
        paso: 8,
        nivel: 'incompleto',
        mensaje: `${label}: documenta consecuencias (coste, deuda, efectos).`,
      });
    }
    const cuerpo = texto(d.contexto) + texto(d.decision) + texto(d.consecuencias);
    if (cuerpo.length > 0 && cuerpo.length < 30) {
      pushRevision(revisiones, {
        id: `adr-${i}-breve`,
        paso: 8,
        nivel: 'contenido',
        mensaje: `${label}: el texto de la decisión es muy breve para arc42.`,
      });
    }
  });
  riesgos.forEach((r, i) => {
    const titulo = texto(r.titulo) || `Riesgo ${i + 1}`;
    if (!texto(r.titulo)) {
      pushRevision(revisiones, {
        id: `riesgo-${i}-titulo`,
        paso: 8,
        nivel: 'incompleto',
        mensaje: `Riesgo ${i + 1}: falta el título.`,
      });
    }
    if (!texto(r.descripcion)) {
      pushRevision(revisiones, {
        id: `riesgo-${i}-descripcion`,
        paso: 8,
        nivel: 'faltante',
        mensaje: `${titulo}: describe el impacto si el riesgo se materializa.`,
      });
    }
    if (!texto(r.causa)) {
      pushRevision(revisiones, {
        id: `riesgo-${i}-causa`,
        paso: 8,
        nivel: 'incompleto',
        mensaje: `${titulo}: indica la causa raíz o por qué existe hoy.`,
      });
    }
    if (!texto(r.relacionControl)) {
      pushRevision(revisiones, {
        id: `riesgo-${i}-control`,
        paso: 8,
        nivel: 'incompleto',
        mensaje: `${titulo}: vincula un control Well-Architected cuando aplique.`,
      });
    } else if (controlIds.size > 0 && !controlIds.has(r.relacionControl)) {
      pushRevision(revisiones, {
        id: `riesgo-${i}-control-invalido`,
        paso: 8,
        nivel: 'contenido',
        mensaje: `${titulo}: el control ${r.relacionControl} no coincide con la evaluación cargada.`,
      });
    }
  });

  return revisiones;
}

/**
 * Evalúa reglas contra contextoNegocio del documento y revisa formularios
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
  const patronMotivos = {};
  const antipatronMotivos = {};

  for (const regla of reglas) {
    const cond = regla.condicion || {};
    const match = Object.entries(cond).every(([k, v]) => ctx[k] === v);
    if (!match) continue;

    for (const p of regla.patrones || []) {
      patronIds.add(p);
      patronMotivos[p] = regla.motivo;
    }
    for (const a of regla.antipatrones || []) {
      antipatronIds.add(a);
      antipatronMotivos[a] = regla.motivo;
    }

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

  const revisiones = revisarFormularios(doc, { patronIds, antipatronIds });

  return {
    patrones: patronesSugeridos,
    antipatrones: antipatronesSugeridos,
    servicios: serviciosSugeridos,
    motivos,
    revisiones,
    patronMotivos,
    antipatronMotivos,
  };
}

/**
 * Fusiona sugerencias en el documento (no sobrescribe adopciones explícitas)
 */
export function aplicarSugerencias(doc) {
  const sug = sugerirParaDocumento(doc);
  const existentesPat = new Map((doc.patrones || []).map((p) => [p.id, p]));
  const existentesAnti = new Map((doc.antipatrones || []).map((a) => [a.id, a]));
  const aplicado = { patrones: [], antipatrones: [], servicios: [] };

  for (const p of sug.patrones) {
    if (!existentesPat.has(p.id)) {
      aplicado.patrones.push(p.id);
      existentesPat.set(p.id, {
        id: p.id,
        nombre: p.nombre,
        estado: 'sugerido',
        motivo: sug.patronMotivos[p.id] || p.cuando || '',
      });
    }
  }
  for (const a of sug.antipatrones) {
    if (!existentesAnti.has(a.id)) {
      aplicado.antipatrones.push(a.id);
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
      if (!sel.has(s.id)) aplicado.servicios.push(s.id);
      sel.add(s.id);
    }
  }
  doc.nube = doc.nube || {};
  doc.nube.serviciosSeleccionados = [...sel];

  return { documento: doc, sugerencias: sug, aplicado };
}