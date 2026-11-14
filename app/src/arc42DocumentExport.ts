import { downloadStyledPdf, pdfFilename } from './downloadStyledPdf'
import { loadMermaidForPrint } from './mermaidLoader'

type MarkedParser = (typeof import('marked'))['marked']

let printMarked: Promise<MarkedParser> | null = null

async function loadPrintMarked(): Promise<MarkedParser> {
  if (!printMarked) {
    printMarked = import('marked').then((mod) => {
      mod.marked.setOptions({ gfm: true, breaks: false })
      return mod.marked
    })
  }
  return printMarked
}

type MdPart = { type: 'md'; content: string } | { type: 'mermaid'; content: string }

function splitMarkdownParts(markdown: string): MdPart[] {
  const re = /```mermaid\n([\s\S]*?)```/g
  const parts: MdPart[] = []
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(markdown)) !== null) {
    if (match.index > last) parts.push({ type: 'md', content: markdown.slice(last, match.index) })
    parts.push({ type: 'mermaid', content: match[1] })
    last = match.index + match[0].length
  }
  if (last < markdown.length) parts.push({ type: 'md', content: markdown.slice(last) })
  if (parts.length === 0) parts.push({ type: 'md', content: markdown })
  return parts
}

const PRINT_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&family=PT+Sans:wght@400;700&family=PT+Sans+Narrow:wght@400;700&display=swap');

* { box-sizing: border-box; }

body {
  font-family: 'PT Sans', sans-serif;
  font-size: 11pt;
  line-height: 1.5;
  color: #000000;
  margin: 0;
  padding: 0;
  background: #ffffff;
}

.doc-header {
  font-family: 'PT Sans Narrow', 'PT Sans', sans-serif;
  font-weight: 400;
  color: #c62828;
  font-size: 9pt;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin: 0 0 0.5rem;
}

.content-block h1,
.content-block h2,
.content-block h3,
.content-block h4 {
  font-family: 'PT Sans Narrow', 'PT Sans', sans-serif;
  font-weight: 400;
  color: #c62828;
  margin: 1.25rem 0 0.45rem;
  page-break-after: avoid;
}

.content-block h1 { font-size: 22pt; border-bottom: 1px solid #e5e5e5; padding-bottom: 0.35rem; }
.content-block h2.toc-title { break-before: auto; page-break-before: auto; }
.content-block h2 { font-size: 16pt; margin-top: 1.5rem; }
.content-block h2.chapter { break-before: page; page-break-before: always; }
.content-block h3 { font-size: 13pt; }
.content-block h4 { font-size: 11.5pt; }

.content-block p {
  margin: 0.45rem 0;
  color: #000000;
}

.content-block ul,
.content-block ol {
  margin: 0.35rem 0 0.85rem 1.35rem;
  color: #000000;
}

.content-block li { margin: 0.2rem 0; }

.content-block strong { font-weight: 700; color: #000000; }

.content-block em {
  color: #333333;
  font-style: italic;
}

.content-block blockquote {
  margin: 0.6rem 0 1rem;
  padding: 0.55rem 0.85rem;
  border-left: 3px solid #c62828;
  background: #fafafa;
  color: #333333;
  font-size: 10pt;
}

.content-block table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.55rem 0 0.35rem;
  font-size: 10pt;
  page-break-inside: auto;
}

.content-block thead { display: table-header-group; }

.content-block th,
.content-block td {
  border: 1px solid #d0d0d0;
  padding: 0.35rem 0.55rem;
  text-align: left;
  vertical-align: top;
}

.content-block th {
  font-family: 'PT Sans Narrow', 'PT Sans', sans-serif;
  font-weight: 400;
  color: #c62828;
  background: #fafafa;
}

.content-block table.budget td:last-child,
.content-block table.budget th:last-child,
.content-block h3 + table td:last-child,
.content-block h3 + table th:last-child {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.cover {
  break-after: page;
  page-break-after: always;
  min-height: 22cm;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 1.5cm 0 2cm;
}

.cover-kicker,
.toc-title {
  font-family: 'PT Sans Narrow', 'PT Sans', sans-serif;
  font-weight: 400;
  color: #c62828;
}

.cover-kicker {
  font-size: 11pt;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0 0 0.8rem;
}

.cover h1 {
  font-size: 28pt;
  line-height: 1.15;
  border: none;
  margin: 0 0 0.8rem;
  padding: 0;
}

.cover-rule {
  width: 4.5rem;
  border-top: 2px solid #c62828;
  margin: 0 0 1.2rem;
}

.cover-meta {
  margin: 0.15rem 0;
  font-size: 12pt;
}

.cover-note {
  margin-top: 2rem;
  max-width: 32rem;
  font-size: 10pt;
  color: #333333;
}

.toc { margin: 0 0 1.25rem; }
.toc ol { margin: 0.4rem 0 0.4rem 1.3rem; }
.toc li { margin: 0.28rem 0; }
.toc a { color: #000000; text-decoration: none; }

.glossary { margin: 0.4rem 0 1rem; }
.glossary dt {
  font-family: 'PT Sans Narrow', 'PT Sans', sans-serif;
  font-weight: 400;
  color: #c62828;
  font-size: 12pt;
  margin-top: 0.7rem;
}
.glossary dd { margin: 0.12rem 0 0.2rem; }

.content-block tr { page-break-inside: avoid; }

.content-block hr {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 1.25rem 0;
}

.content-block code {
  font-family: 'Fira Code', ui-monospace, monospace;
  font-size: 9pt;
  background: #f4f4f4;
  padding: 0.08em 0.35em;
  border-radius: 3px;
  color: #1a1a1a;
}

.content-block pre {
  font-family: 'Fira Code', ui-monospace, monospace;
  font-size: 9pt;
  background: #f8f8f8;
  border: 1px solid #e0e0e0;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  overflow-x: auto;
  page-break-inside: avoid;
}

.content-block pre code {
  background: none;
  padding: 0;
}

.diagram-page {
  page: landscape;
  break-before: page;
  break-after: page;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.25cm;
}

.diagram-caption {
  font-family: 'PT Sans Narrow', 'PT Sans', sans-serif;
  font-size: 10pt;
  color: #c62828;
  margin-top: 0.75rem;
  text-align: center;
}

.diagram-frame {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.diagram-frame svg {
  max-width: 100%;
  max-height: 16.5cm;
  height: auto;
}

.screen-toolbar {
  position: sticky;
  top: 0;
  background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
  padding: 0.75rem 1rem;
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  font-family: 'PT Sans', sans-serif;
}

.screen-toolbar button {
  font-family: 'PT Sans', sans-serif;
  font-size: 10pt;
  padding: 0.4rem 0.9rem;
  border: 1px solid #c62828;
  background: #c62828;
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
}

.screen-toolbar button.secondary {
  background: #fff;
  color: #333;
  border-color: #ccc;
}

@page {
  size: A4 portrait;
  margin: 2cm;
}

@page landscape {
  size: A4 landscape;
  margin: 1.25cm;
}

html.pdf-capture .cover,
html.pdf-capture .diagram-page {
  min-height: 0;
  break-before: auto;
  break-after: auto;
  page-break-before: auto;
  page-break-after: auto;
  margin: 0;
  border: none;
}

.pdf-sheet { position: relative; }
.pdf-running-header,
.pdf-running-footer {
  position: absolute;
  left: 16mm;
  right: 16mm;
  z-index: 2;
  font-size: 9pt;
  line-height: 1.2;
}
.pdf-running-header {
  top: 6mm;
  display: flex;
  justify-content: flex-end;
  align-items: baseline;
  gap: 0.75rem;
  font-family: 'PT Sans Narrow', 'PT Sans', sans-serif;
  font-weight: 400;
  color: #c62828;
  text-align: right;
}
.pdf-running-year { letter-spacing: 0.04em; }
.pdf-running-footer {
  bottom: 6mm;
  text-align: center;
  font-family: 'PT Sans', sans-serif;
  color: #000000;
}
.pdf-sheet.landscape .pdf-running-header,
.pdf-sheet.landscape .pdf-running-footer {
  left: 12mm;
  right: 12mm;
}
.pdf-sheet .content-block { height: 100%; }
.pdf-sheet .cover {
  min-height: 100%;
  height: 100%;
  padding: 0;
}
.pdf-sheet .diagram-page {
  min-height: 100%;
  height: 100%;
  padding: 0;
  display: flex;
}
.pdf-sheet .diagram-frame svg {
  max-height: 150mm;
  max-width: 100%;
}

.budget-doc td:last-child,
.budget-doc th:last-child {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

@media print {
  .screen-toolbar { display: none !important; }
  .doc-body { padding: 0; }
}
`

async function buildBodyHtml(markdown: string): Promise<string> {
  const [mermaid, marked] = await Promise.all([loadMermaidForPrint(), loadPrintMarked()])

  const chunks: string[] = []
  let diagramIndex = 0

  for (const part of splitMarkdownParts(markdown)) {
    if (part.type === 'mermaid') {
      const chart = part.content.trim()
      if (!chart) continue
      diagramIndex += 1
      const renderId = `arc42-print-${diagramIndex}-${Date.now()}`
      try {
        const { svg } = await mermaid.render(renderId, chart)
        chunks.push(
          `<section class="diagram-page" aria-label="Diagrama ${diagramIndex}"><div class="diagram-frame">${svg}</div><p class="diagram-caption">Diagrama ${diagramIndex}</p></section>`
        )
      } catch {
        chunks.push(
          `<section class="diagram-page"><p class="diagram-caption">No se pudo renderizar el diagrama ${diagramIndex}</p><div class="content-block"><pre><code>${escapeHtml(chart)}</code></pre></div></section>`
        )
      }
    } else if (part.content.trim()) {
      const html = await marked.parse(part.content)
      chunks.push(`<div class="content-block">${html}</div>`)
    }
  }

  return chunks.join('\n')
}

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildDocument(title: string, bodyHtml: string, kind = 'arc42', banner = true, bodyClass = '') {
  const safeTitle = escapeHtml(title || kind)
  const safeKind = escapeHtml(kind)
  const header = banner ? `<p class="doc-header">${safeTitle}</p>` : ''
  const mainClass = ['doc-body', bodyClass].filter(Boolean).join(' ')
  return `<!DOCTYPE html>
<html lang="es" class="pdf-capture">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} — ${safeKind}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <main class="${mainClass}">
    ${header}
    ${bodyHtml}
  </main>
</body>
</html>`
}

function yearOf(fecha?: string) {
  const match = String(fecha || '').match(/\d{4}/)
  return match?.[0] || String(new Date().getFullYear())
}

/** Descarga el arc42 como PDF, sin abrir otra ventana. */
export async function exportArc42Pdf(documentTitle: string, markdown: string, fecha?: string): Promise<void> {
  const bodyHtml = await buildBodyHtml(markdown)
  const title = documentTitle || 'arc42'
  await downloadStyledPdf(buildDocument(title, bodyHtml, 'arc42'), pdfFilename(title, 'arc42'), {
    title,
    year: yearOf(fecha),
  })
}

/** Descarga el presupuesto como PDF, sin abrir otra ventana. */
export async function exportPresupuestoPdf(documentTitle: string, markdown: string, fecha?: string): Promise<void> {
  const marked = await loadPrintMarked()
  const html = await marked.parse(markdown)
  const title = documentTitle || 'presupuesto'
  await downloadStyledPdf(
    buildDocument(title, `<div class="content-block">${html}</div>`, 'Presupuesto', false, 'budget-doc'),
    pdfFilename(title, 'presupuesto'),
    { title, year: yearOf(fecha) },
  )
}