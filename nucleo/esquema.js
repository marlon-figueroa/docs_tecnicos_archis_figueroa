/** @typedef {'aws'|'azure'|'hibrido'} ProveedorNube */
/** @typedef {'cumple'|'parcial'|'brecha'|'no-aplica'} EstadoControl */

export const VERSION_ESQUEMA = '1.0';

export const CAPACIDADES = [
  'compute',
  'integracion',
  'datos',
  'identidad',
  'red',
  'seguridad',
  'observabilidad',
];

export const PILARES = [
  'excelencia-operacional',
  'seguridad',
  'fiabilidad',
  'eficiencia-rendimiento',
  'optimizacion-costos',
  'sostenibilidad',
];

/**
 * Documento vacío de arquitectura
 * @returns {import('./tipos.js').DocumentoArquitectura}
 */
export function documentoVacio() {
  return {
    meta: {
      versionEsquema: VERSION_ESQUEMA,
      nombreProyecto: '',
      proveedorNube: 'aws',
      fecha: new Date().toISOString().slice(0, 10),
      autor: '',
    },
    arc42: {
      introduccion: {
        vision: '',
        metas: [],
        stakeholders: [],
      },
      restricciones: [],
      contexto: {
        actores: [],
        sistemasExternos: [],
        relaciones: [],
      },
      escenariosCalidad: [{ nombre: '', estimulo: '', respuesta: '', medida: '' }],
      estrategia: {
        resumen: '',
        decisionesClave: [],
      },
      bloques: [{ nombre: '', responsabilidad: '', tecnologia: '' }],
      escenariosEjecucion: [],
      despliegue: {
        entornos: [],
        topologia: '',
        notas: '',
      },
      conceptosTransversales: [],
      decisiones: [],
      riesgos: [],
    },
    nube: {
      serviciosSeleccionados: [],
      proveedorSecundario: null,
    },
    patrones: [],
    antipatrones: [],
    evaluacionWellArchitected: {
      proveedorEvaluado: 'aws',
      pilares: [],
    },
    contextoNegocio: {
      cargaVariable: false,
      tareasCortas: false,
      datosTransaccionales: false,
      modeloRelacional: false,
      multiplesClientes: false,
      picosCarga: false,
      integracionEventos: false,
      lecturasIntensivas: false,
      usuariosExternos: false,
      almacenamientoObjetos: false,
      estiloMicroservicios: false,
      sistemaLegado: false,
      rtoHorasMenor24: false,
      multiplesRedes: false,
      slaOperativo: false,
      manejaSecretos: true,
      contenedores: false,
    },
  };
}

export function normalizarProveedor(p) {
  if (p === 'aws' || p === 'azure' || p === 'hibrido') return p;
  return 'aws';
}