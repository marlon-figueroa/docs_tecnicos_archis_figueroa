type Orientation = 'portrait' | 'landscape'

const PORTRAIT = { widthMm: 210, heightMm: 297, padMm: 16 }
const LANDSCAPE = { widthMm: 297, heightMm: 210, padMm: 12 }

function pageSpec(orientation: Orientation) {
  return orientation === 'landscape' ? LANDSCAPE : PORTRAIT
}

function slug(value: string) {
  const base = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return base || 'documento'
}

export function pdfFilename(title: string, kind: string) {
  return `${slug(title)}-${slug(kind)}.pdf`
}

function pxPerMm(doc: Document) {
  const probe = doc.createElement('div')
  probe.style.cssText = 'position:absolute;width:100mm;height:0;visibility:hidden'
  doc.body.appendChild(probe)
  const px = probe.getBoundingClientRect().width / 100
  probe.remove()
  return px || 96 / 25.4
}

function blockHeight(el: HTMLElement) {
  const view = el.ownerDocument.defaultView
  const style = view?.getComputedStyle(el)
  const marginTop = style ? Number.parseFloat(style.marginTop) || 0 : 0
  const marginBottom = style ? Number.parseFloat(style.marginBottom) || 0 : 0
  return el.getBoundingClientRect().height + marginTop + marginBottom
}

function contentLimit(doc: Document, orientation: Orientation) {
  const spec = pageSpec(orientation)
  return (spec.heightMm - spec.padMm * 2) * pxPerMm(doc) - 4
}

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === 1
}

function flatten(root: HTMLElement) {
  const out: HTMLElement[] = []
  for (const child of [...root.children]) {
    if (!isElement(child)) continue
    if (child.classList.contains('content-block')) {
      for (const inner of [...child.children]) {
        if (isElement(inner)) out.push(inner)
      }
    } else {
      out.push(child)
    }
  }
  return out
}

function splitTable(table: HTMLTableElement, maxH: number) {
  const doc = table.ownerDocument
  const parent = table.parentElement
  const body = table.querySelector('tbody')
  const rows = body
    ? [...body.rows]
    : [...table.rows].filter((row) => row.parentElement?.tagName !== 'THEAD')
  if (!parent || rows.length <= 1) return [table]

  const theadHTML = table.querySelector('thead')?.innerHTML ?? ''
  const parts: HTMLTableElement[] = []
  const anchor = doc.createComment('split')
  parent.insertBefore(anchor, table)

  const open = () => {
    const fresh = doc.createElement('table')
    fresh.className = table.className
    if (theadHTML) {
      const head = doc.createElement('thead')
      head.innerHTML = theadHTML
      fresh.appendChild(head)
    }
    fresh.appendChild(doc.createElement('tbody'))
    parent.insertBefore(fresh, anchor)
    return fresh
  }

  let current = open()
  let tbody = current.querySelector('tbody') as HTMLTableSectionElement
  for (const row of rows) {
    tbody.appendChild(row)
    if (blockHeight(current) > maxH && tbody.rows.length > 1) {
      tbody.removeChild(row)
      parts.push(current)
      current = open()
      tbody = current.querySelector('tbody') as HTMLTableSectionElement
      tbody.appendChild(row)
    }
  }
  if (tbody.rows.length) parts.push(current)
  else current.remove()
  table.remove()
  anchor.remove()
  return parts
}

function unitsOf(source: HTMLElement, children: HTMLElement[]) {
  if (source.tagName !== 'DL') return children.map((child) => [child])
  const pairs: HTMLElement[][] = []
  let pair: HTMLElement[] = []
  for (const child of children) {
    pair.push(child)
    if (child.tagName === 'DD' || pair.length === 2) {
      pairs.push(pair)
      pair = []
    }
  }
  if (pair.length) pairs.push(pair)
  return pairs
}

function splitChildren(source: HTMLElement, maxH: number) {
  const parent = source.parentElement
  const children = [...source.children].filter(isElement)
  if (!parent || children.length <= 1) return [source]

  const parts: HTMLElement[] = []
  const anchor = source.ownerDocument.createComment('split')
  parent.insertBefore(anchor, source)

  const open = () => {
    const el = source.ownerDocument.createElement(source.tagName.toLowerCase())
    el.className = source.className
    parent.insertBefore(el, anchor)
    return el
  }

  let current = open()
  for (const unit of unitsOf(source, children)) {
    for (const node of unit) current.appendChild(node)
    if (blockHeight(current) > maxH && current.children.length > unit.length) {
      for (const node of unit) current.removeChild(node)
      parts.push(current)
      current = open()
      for (const node of unit) current.appendChild(node)
    }
  }
  if (current.children.length) parts.push(current)
  else current.remove()
  source.remove()
  anchor.remove()
  return parts.length ? parts : [source]
}

function splitOversized(el: HTMLElement, maxH: number): HTMLElement[] {
  if (blockHeight(el) <= maxH) return [el]
  if (el.tagName === 'TABLE') return splitTable(el as HTMLTableElement, maxH)
  if (el.tagName === 'OL' || el.tagName === 'UL' || el.tagName === 'DL') {
    return splitChildren(el, maxH)
  }
  return [el]
}

function mountSheet(doc: Document, nodes: HTMLElement[], orientation: Orientation) {
  const spec = pageSpec(orientation)
  const sheet = doc.createElement('section')
  sheet.className = `pdf-sheet${orientation === 'landscape' ? ' landscape' : ''}`
  sheet.style.width = `${spec.widthMm}mm`
  sheet.style.height = `${spec.heightMm}mm`
  sheet.style.padding = `${spec.padMm}mm`
  sheet.style.boxSizing = 'border-box'
  sheet.style.background = '#ffffff'
  sheet.style.overflow = 'hidden'
  const inner = doc.createElement('div')
  inner.className = 'content-block'
  inner.style.height = '100%'
  sheet.appendChild(inner)
  for (const node of nodes) inner.appendChild(node)
  doc.body.appendChild(sheet)
  return sheet
}

function paginate(doc: Document, root: HTMLElement) {
  const flow = flatten(root)
  const sheets: HTMLElement[] = []
  let bucket: HTMLElement[] = []
  let orientation: Orientation = 'portrait'
  let used = 0

  const flush = () => {
    if (!bucket.length) return
    sheets.push(mountSheet(doc, bucket, orientation))
    bucket = []
    used = 0
    orientation = 'portrait'
  }

  for (const node of flow) {
    if (
      node.classList.contains('cover') ||
      node.classList.contains('diagram-page') ||
      node.classList.contains('dashboard-landscape')
    ) {
      flush()
      const next =
        node.classList.contains('diagram-page') || node.classList.contains('dashboard-landscape')
          ? 'landscape'
          : 'portrait'
      sheets.push(mountSheet(doc, [node], next))
      continue
    }

    if (node.classList.contains('chapter') || node.classList.contains('toc')) flush()

    const limit = contentLimit(doc, 'portrait')
    const pieces = splitOversized(node, limit)
    for (const piece of pieces) {
      const height = blockHeight(piece)
      if (bucket.length && used + height > limit) flush()
      bucket.push(piece)
      used += height
    }
  }

  flush()
  return sheets
}

async function waitForFonts(doc: Document) {
  const fonts = doc.fonts
  if (!fonts) return
  await fonts.ready
  await Promise.allSettled([
    fonts.load("16px 'PT Sans'"),
    fonts.load("16px 'PT Sans Narrow'"),
    fonts.load("14px 'Fira Code'"),
  ])
}

function placeImage(
  pdf: import('jspdf').jsPDF,
  canvas: HTMLCanvasElement,
) {
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const ratio = canvas.width / canvas.height
  let width = pageW
  let height = pageW / ratio
  if (height > pageH) {
    height = pageH
    width = pageH * ratio
  }
  const x = (pageW - width) / 2
  const y = (pageH - height) / 2
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', x, y, width, height)
}

function stampSheet(sheet: HTMLElement, page: number, total: number, title: string, year: string) {
  const doc = sheet.ownerDocument
  const header = doc.createElement('header')
  header.className = 'pdf-running-header'
  const titleEl = doc.createElement('span')
  titleEl.className = 'pdf-running-title'
  titleEl.textContent = title
  const yearEl = doc.createElement('span')
  yearEl.className = 'pdf-running-year'
  yearEl.textContent = year
  header.append(titleEl, yearEl)
  const footer = doc.createElement('footer')
  footer.className = 'pdf-running-footer'
  footer.textContent = `Página ${page} de ${total}`
  sheet.append(header, footer)
}

/** Genera un PDF a partir del HTML de impresión, sin descargarlo. */
export async function generateStyledPdfBlob(
  html: string,
  running: { title: string; year: string } = { title: '', year: '' },
): Promise<Blob> {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText =
    'position:fixed;left:-12000px;top:0;width:320mm;height:340mm;border:0;opacity:0;pointer-events:none'
  document.body.appendChild(iframe)

  try {
    const doc = iframe.contentDocument
    if (!doc) throw new Error('No se pudo preparar el PDF.')
    doc.open()
    doc.write(html)
    doc.close()
    await waitForFonts(doc)

    const root = doc.querySelector<HTMLElement>('.doc-body')
    if (!root) throw new Error('El documento no tiene contenido.')
    const limit = contentLimit(doc, 'portrait')
    root.style.width = `${PORTRAIT.widthMm - PORTRAIT.padMm * 2}mm`
    const sheets = paginate(doc, root)
    if (!sheets.length || limit <= 0) throw new Error('El documento está vacío.')
    const runningTitle = running.title.trim() || 'Documento'
    const runningYear = running.year.trim() || String(new Date().getFullYear())
    sheets.forEach((sheet, index) => stampSheet(sheet, index + 1, sheets.length, runningTitle, runningYear))

    const [{ jsPDF }, html2canvasMod] = await Promise.all([import('jspdf'), import('html2canvas')])
    const html2canvas = html2canvasMod.default
    const firstLandscape = sheets[0]?.classList.contains('landscape')
    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: firstLandscape ? 'landscape' : 'portrait',
    })

    for (let index = 0; index < sheets.length; index += 1) {
      const sheet = sheets[index]
      if (!sheet) continue
      const landscape = sheet.classList.contains('landscape')
      if (index > 0) pdf.addPage('a4', landscape ? 'landscape' : 'portrait')
      sheet.style.position = 'absolute'
      sheet.style.left = '0'
      sheet.style.top = '0'
      const canvas = await html2canvas(sheet, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        width: sheet.offsetWidth,
        height: sheet.offsetHeight,
        windowWidth: sheet.offsetWidth,
        windowHeight: sheet.offsetHeight,
      })
      placeImage(pdf, canvas)
    }

    return pdf.output('blob')
  } finally {
    iframe.remove()
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** Renderiza el HTML del documento y descarga un PDF, sin abrir otra ventana. */
export async function downloadStyledPdf(
  html: string,
  filename: string,
  running: { title: string; year: string } = { title: '', year: '' },
) {
  const blob = await generateStyledPdfBlob(html, running)
  downloadBlob(blob, filename)
}
