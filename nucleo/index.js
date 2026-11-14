export { documentoVacio, VERSION_ESQUEMA, CAPACIDADES, PILARES, normalizarProveedor } from './esquema.js';
export { setCatalogos, cargarCatalogos, serviciosPorProveedor, servicioPorId } from './catalogos-store.js';
export { cargarCatalogos as cargarCatalogosNode } from './cargar-catalogos.js';
export { sugerirParaDocumento, aplicarSugerencias } from './sugerir.js';
export { validarDocumento } from './validar.js';
export { inicializarEvaluacion, resumenEvaluacion, buenasPracticasParaDocumento } from './evaluar-waf.js';
export { renderArc42Markdown } from './render-arc42.js';