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
.content-block h2 { font-size: 16pt; margin-top: 1.5rem; }
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

@media screen {
  body { max-width: 210mm; margin: 0 auto; }
  .doc-body { padding: 1.25rem 1.5rem 2rem; }
  .diagram-page {
    min-height: 70vh;
    border: 1px dashed #ddd;
    margin: 1.5rem 0;
    background: #fefefe;
  }
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

function buildDocument(title: string, bodyHtml: string) {
  const safeTitle = escapeHtml(title || 'arc42')
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} — arc42</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <div class="screen-toolbar">
    <button type="button" class="secondary" onclick="window.close()">Cerrar</button>
    <button type="button" onclick="window.print()">Guardar como PDF</button>
  </div>
  <main class="doc-body">
    <p class="doc-header">${safeTitle}</p>
    ${bodyHtml}
  </main>
  <script>
    window.addEventListener('load', function () {
      var done = function () { setTimeout(function () { window.print(); }, 350); };
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(done);
      } else {
        done();
      }
    });
  </script>
</body>
</html>`
}

/** Abre el arc42 estilizado; el usuario guarda como PDF desde el diálogo del navegador. */
export async function exportArc42Pdf(documentTitle: string, markdown: string): Promise<void> {
  const bodyHtml = await buildBodyHtml(markdown)
  const html = buildDocument(documentTitle, bodyHtml)

  const win = window.open('', '_blank')
  if (!win) {
    throw new Error('Permite ventanas emergentes para generar el PDF.')
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
}