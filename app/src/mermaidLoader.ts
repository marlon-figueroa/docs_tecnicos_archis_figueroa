type MermaidModule = (typeof import('mermaid'))['default']
type MermaidConfig = Parameters<MermaidModule['initialize']>[0]

function loadWithOptions(options: MermaidConfig): Promise<MermaidModule> {
  return import('mermaid/dist/mermaid.core.mjs').then((mod) => {
    const mermaid = mod.default
    mermaid.initialize(options)
    return mermaid
  })
}

const previewOptions = {
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'base',
  themeVariables: {
    primaryColor: '#5f27cd',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#4a1fa8',
    lineColor: '#5f27cd',
    secondaryColor: '#f4f0ff',
    tertiaryColor: '#fafafa',
  },
} as const satisfies MermaidConfig

const printOptions = {
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'base',
  themeVariables: {
    primaryColor: '#f5f5f5',
    primaryTextColor: '#000000',
    primaryBorderColor: '#c62828',
    lineColor: '#333333',
    secondaryColor: '#ffffff',
    tertiaryColor: '#fafafa',
    fontFamily: 'PT Sans, sans-serif',
  },
} as const satisfies MermaidConfig

let previewPromise: Promise<MermaidModule> | null = null
let printPromise: Promise<MermaidModule> | null = null

export function loadMermaidForPreview(): Promise<MermaidModule> {
  previewPromise ??= loadWithOptions(previewOptions)
  return previewPromise
}

export function loadMermaidForPrint(): Promise<MermaidModule> {
  printPromise ??= loadWithOptions(printOptions)
  return printPromise
}