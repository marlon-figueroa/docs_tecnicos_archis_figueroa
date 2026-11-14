import regularUrl from '@fontsource/pt-sans/files/pt-sans-latin-400-normal.woff2?url'
import boldUrl from '@fontsource/pt-sans/files/pt-sans-latin-700-normal.woff2?url'

export const DIAGRAM_FONT = 'PT Sans, sans-serif'

async function fontDataUrl(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error('No se pudo cargar PT Sans')
  const bytes = new Uint8Array(await response.arrayBuffer())
  let binary = ''
  const size = 0x2000
  for (let i = 0; i < bytes.length; i += size) {
    binary += String.fromCharCode(...bytes.subarray(i, i + size))
  }
  return `data:font/woff2;base64,${btoa(binary)}`
}

function face(weight: number, dataUrl: string) {
  return `@font-face{font-family:'PT Sans';font-style:normal;font-weight:${weight};src:url('${dataUrl}') format('woff2');}`
}

let svgCss: Promise<string> | null = null

/** CSS con PT Sans incrustada para que el archivo SVG no dependa de la página. */
export function ptSansSvgCss() {
  svgCss ??= Promise.all([fontDataUrl(regularUrl), fontDataUrl(boldUrl)]).then(([regular, bold]) =>
    [
      face(400, regular),
      face(600, bold),
      face(700, bold),
      "text,tspan{font-family:'PT Sans',sans-serif;}",
    ].join('\n'),
  )
  return svgCss
}

export function ensurePtSans() {
  return Promise.all([
    document.fonts.load("11px 'PT Sans'"),
    document.fonts.load("600 11px 'PT Sans'"),
    document.fonts.load("700 11px 'PT Sans'"),
  ]).then(() => undefined)
}
