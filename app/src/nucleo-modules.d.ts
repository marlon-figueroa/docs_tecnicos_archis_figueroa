declare module '@nucleo/esquema.js' {
  export function documentoVacio(): Record<string, unknown>
  export const VERSION_ESQUEMA: string
  export const CAPACIDADES: string[]
  export const PILARES: string[]
  export function normalizarProveedor(p: string): string
}

declare module '@nucleo/catalogos-store.js' {
  export function setCatalogos(data: object): void
  export function cargarCatalogos(): object
  export function serviciosPorProveedor(proveedor: string): Array<{
    id: string
    nombre: string
    descripcion: string
    capacidad: string
    proveedor: string
  }>
  export function servicioPorId(id: string): unknown
}

declare module '@nucleo/sugerir.js' {
  export function sugerirParaDocumento(doc: object): {
    patrones: unknown[]
    antipatrones: unknown[]
    servicios: Array<{ id: string; nombre: string }>
    motivos: unknown[]
  }
  export function aplicarSugerencias(doc: object): { documento: object; sugerencias: object }
}

declare module '@nucleo/evaluar-waf.js' {
  export function inicializarEvaluacion(doc: object): object
  export function resumenEvaluacion(doc: object): {
    cumple: number
    parcial: number
    brecha: number
    noAplica: number
    brechasCriticas: unknown[]
  }
  export function buenasPracticasParaDocumento(doc: object): object
}

declare module '@nucleo/validar.js' {
  export function validarDocumento(doc: object): {
    valido: boolean
    errores: string[]
    advertencias: string[]
  }
}

declare module '@nucleo/render-arc42.js' {
  export function renderArc42Markdown(doc: object): string
}