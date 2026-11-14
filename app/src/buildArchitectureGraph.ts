import type { dia, shapes } from '@joint/core'
import { servicioPorId } from '@nucleo/catalogos-store.js'

const PRIMARY = '#5f27cd'
const PRIMARY_DARK = '#4a1fa8'
const PRIMARY_TEXT = '#ffffff'
const ACTOR_FILL = '#f4f0ff'
const EXTERNAL_FILL = '#fff8e1'
const SERVICE_FILL = '#e8f5e9'
const LABEL_FILL = '#5f5f5f'

export type CellMeta = {
  tipo: 'actor' | 'contenedor' | 'externo' | 'servicio' | 'decoracion'
  titulo: string
  detalle?: string
}

type GraphShapes = typeof shapes

export type GraphBuildResult = {
  cells: dia.Cell[]
  width: number
  height: number
}

function lineWrap(text: string, maxChars: number, maxLines: number) {
  const words = (text || '').trim().split(/\s+/)
  if (!words.length) return ''
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    const next = current ? `${current} ${w}` : w
    if (next.length > maxChars && current) {
      lines.push(current)
      current = w
      if (lines.length >= maxLines) break
    } else {
      current = next
    }
  }
  if (lines.length < maxLines && current) lines.push(current)
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    const last = lines[lines.length - 1]
    lines[lines.length - 1] = last.length > maxChars - 1 ? `${last.slice(0, maxChars - 2)}…` : `${last}…`
  }
  return lines.join('\n')
}

function laneLabel(shapes: GraphShapes, x: number, y: number, text: string) {
  return new shapes.standard.Rectangle({
    position: { x, y },
    size: { width: 140, height: 22 },
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent' },
      label: {
        text: text.toUpperCase(),
        fill: LABEL_FILL,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.6,
        refX: 0,
        refY: '50%',
      },
    },
    meta: { tipo: 'decoracion', titulo: text } satisfies CellMeta,
  })
}

function rowStart(origin: number, span: number, count: number, item: number, gap: number) {
  const width = count * item + Math.max(0, count - 1) * gap
  return origin + Math.max(0, (span - width) / 2)
}

function strokeAttrs(stroke: string, width: number, dashed?: boolean) {
  return {
    stroke,
    strokeWidth: width,
    strokeDasharray: dashed ? '6 4' : undefined,
    targetMarker: { type: 'path', fill: stroke, stroke, d: 'M 8 -4 0 0 8 4 Z' },
  }
}

/** Cajas en la misma fila: lado derecho → lado izquierdo. */
function linkBeside(shapes: GraphShapes, sourceId: dia.Cell.ID, targetId: dia.Cell.ID, stroke: string) {
  return new shapes.standard.Link({
    source: { id: sourceId, anchor: { name: 'right' } },
    target: { id: targetId, anchor: { name: 'left' } },
    router: { name: 'normal' },
    connector: { name: 'rounded', args: { radius: 6 } },
    attrs: { line: strokeAttrs(stroke, 2) },
  })
}

/** Origen arriba del destino. */
function linkDown(
  shapes: GraphShapes,
  sourceId: dia.Cell.ID,
  targetId: dia.Cell.ID,
  stroke: string,
  opts?: { dashed?: boolean; sourceDx?: number; targetDx?: number }
) {
  return new shapes.standard.Link({
    source: { id: sourceId, anchor: { name: 'bottom', args: { dx: opts?.sourceDx ?? 0 } } },
    target: { id: targetId, anchor: { name: 'top', args: { dx: opts?.targetDx ?? 0 } } },
    router: {
      name: 'manhattan',
      args: { startDirections: ['bottom'], endDirections: ['top'], padding: 10, step: 10 },
    },
    connector: { name: 'rounded', args: { radius: 8 } },
    attrs: { line: strokeAttrs(stroke, 1.6, opts?.dashed) },
  })
}

/** Sale por la derecha y entra por abajo (un solo contenedor → externos a la derecha). */
function linkOutUp(shapes: GraphShapes, sourceId: dia.Cell.ID, targetId: dia.Cell.ID, stroke: string) {
  return new shapes.standard.Link({
    source: { id: sourceId, anchor: { name: 'right' } },
    target: { id: targetId, anchor: { name: 'bottom' } },
    router: {
      name: 'manhattan',
      args: { startDirections: ['right'], endDirections: ['bottom'], padding: 14, step: 12 },
    },
    connector: { name: 'rounded', args: { radius: 8 } },
    attrs: { line: strokeAttrs(stroke, 1.6, true) },
  })
}

/** Destino arriba del origen (último contenedor → sistema externo). */
function linkUp(
  shapes: GraphShapes,
  sourceId: dia.Cell.ID,
  targetId: dia.Cell.ID,
  stroke: string,
  opts?: { targetDx?: number }
) {
  return new shapes.standard.Link({
    source: { id: sourceId, anchor: { name: 'top', args: { dx: opts?.targetDx ?? 0 } } },
    target: { id: targetId, anchor: { name: 'bottom' } },
    router: {
      name: 'manhattan',
      args: { startDirections: ['top'], endDirections: ['bottom'], padding: 12, step: 10 },
    },
    connector: { name: 'rounded', args: { radius: 8 } },
    attrs: { line: strokeAttrs(stroke, 1.6, true) },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildArchitectureGraph(doc: any, shapes: GraphShapes): GraphBuildResult {
  const cells: dia.Cell[] = []
  const links: dia.Cell[] = []

  const NODE_W = 168
  const NODE_H = 64
  const GAP = 28
  const MARGIN = 48
  const GROUP_GAP = 72

  const actores = (doc.arc42?.contexto?.actores || []).filter((a: { nombre?: string }) => (a.nombre || '').trim())
  const externos = (doc.arc42?.contexto?.sistemasExternos || []).filter((a: { nombre?: string }) =>
    (a.nombre || '').trim()
  )
  const bloques = (doc.arc42?.bloques || []).filter((b: { nombre?: string }) => (b.nombre || '').trim())
  const servicioIds: string[] = doc.nube?.serviciosSeleccionados || []
  const proveedor = (doc.meta?.proveedorNube || 'aws').toUpperCase()
  const proyecto = (doc.meta?.nombreProyecto || 'Sistema').trim()

  const svcW = 132
  const svcH = 42
  const svcGap = 14
  const visibleIds = servicioIds.slice(0, 12)
  const svcCols = Math.min(6, Math.max(1, visibleIds.length))
  const svcRows = visibleIds.length ? Math.ceil(visibleIds.length / svcCols) : 0

  const span = (count: number, item: number, gap: number) =>
    count > 0 ? count * item + (count - 1) * gap : 0

  const actorSpan = span(actores.length, NODE_W, GAP)
  const extSpan = span(externos.length, NODE_W, GAP)
  const blockSpan = span(Math.max(bloques.length, 1), NODE_W, GAP)
  const svcSpan = span(Math.min(svcCols, visibleIds.length || 1), svcW, svcGap)
  const contextSpan = actorSpan + (actorSpan && extSpan ? GROUP_GAP : 0) + extSpan

  const cloudWidth = Math.max(contextSpan, blockSpan, svcSpan, 560) + 64
  const width = cloudWidth + MARGIN * 2

  const actorY = 78
  const cloudTop = actorY + NODE_H + 56
  const bloqueY = cloudTop + 52
  const svcTop = bloqueY + NODE_H + 56
  const cloudHeight = svcRows > 0 ? svcTop - cloudTop + svcRows * (svcH + svcGap) + 28 : NODE_H + 88
  const height = cloudTop + cloudHeight + MARGIN

  if (proyecto) {
    cells.push(
      new shapes.standard.Rectangle({
        position: { x: MARGIN, y: 16 },
        size: { width: cloudWidth * 0.62, height: 32 },
        attrs: {
          body: { fill: 'transparent', stroke: 'transparent' },
          label: { text: proyecto, fill: '#111', fontSize: 16, fontWeight: 700, refX: 0, refY: '50%' },
        },
        meta: { tipo: 'decoracion', titulo: proyecto } satisfies CellMeta,
      })
    )
  }

  cells.push(laneLabel(shapes, MARGIN, actorY - 26, 'Personas y sistemas externos'))

  const cloud = new shapes.standard.Rectangle({
    position: { x: MARGIN, y: cloudTop },
    size: { width: cloudWidth, height: cloudHeight },
    attrs: {
      body: {
        fill: '#faf8ff',
        stroke: PRIMARY,
        strokeWidth: 2,
        strokeDasharray: '10 5',
        rx: 14,
        ry: 14,
      },
      label: {
        text: `Nube · ${proveedor}`,
        fill: PRIMARY,
        fontSize: 11,
        fontWeight: 600,
        refX: '50%',
        refY: 16,
        textAnchor: 'middle',
      },
    },
    meta: { tipo: 'decoracion', titulo: `Nube ${proveedor}` } satisfies CellMeta,
  })
  cells.push(cloud)

  const bloqueElements: shapes.standard.Rectangle[] = []
  const blockX = rowStart(MARGIN, cloudWidth, Math.max(bloques.length, 1), NODE_W, GAP)

  bloques.forEach((b: { nombre: string; responsabilidad?: string; tecnologia?: string }, i: number) => {
    const sub = b.tecnologia ? lineWrap(b.tecnologia, 26, 1) : ''
    const el = new shapes.standard.Rectangle({
      position: { x: blockX + i * (NODE_W + GAP), y: bloqueY },
      size: { width: NODE_W, height: NODE_H },
      attrs: {
        body: { fill: PRIMARY, stroke: PRIMARY_DARK, strokeWidth: 1.5, rx: 8, ry: 8 },
        label: {
          text: sub ? `${lineWrap(b.nombre, 24, 1)}\n${sub}` : lineWrap(b.nombre, 24, 2),
          fill: PRIMARY_TEXT,
          fontSize: 11,
          fontWeight: 600,
          lineHeight: 15,
        },
      },
      meta: {
        tipo: 'contenedor',
        titulo: b.nombre,
        detalle: [b.responsabilidad, b.tecnologia].filter(Boolean).join(' · '),
      } satisfies CellMeta,
    })
    bloqueElements.push(el)
    cells.push(el)
  })

  if (bloqueElements.length === 0) {
    cells.push(
      new shapes.standard.Rectangle({
        position: { x: rowStart(MARGIN, cloudWidth, 1, 320, 0), y: bloqueY },
        size: { width: 320, height: NODE_H },
        attrs: {
          body: { fill: '#f5f5f5', stroke: '#ccc', strokeDasharray: '6 4', rx: 8 },
          label: { text: 'Añade contenedores C4\nen «Estrategia y bloques»', fill: '#555', fontSize: 11 },
        },
        meta: { tipo: 'decoracion', titulo: 'Sin contenedores' } satisfies CellMeta,
      })
    )
  }

  for (let i = 0; i < bloqueElements.length - 1; i++) {
    links.push(linkBeside(shapes, bloqueElements[i].id, bloqueElements[i + 1].id, PRIMARY))
  }

  const contextWidth = actorSpan + (actorSpan && extSpan ? GROUP_GAP : 0) + extSpan
  const contextX = MARGIN + Math.max(0, (cloudWidth - contextWidth) / 2)
  const portal = bloqueElements[0]
  const edge = bloqueElements[bloqueElements.length - 1]

  actores.forEach((a: { nombre: string; descripcion?: string }, i: number) => {
    const el = new shapes.standard.Ellipse({
      position: { x: contextX + i * (NODE_W + GAP), y: actorY },
      size: { width: NODE_W, height: NODE_H },
      attrs: {
        body: { fill: ACTOR_FILL, stroke: PRIMARY, strokeWidth: 1.5 },
        label: { text: lineWrap(a.nombre, 22, 2), fill: '#111', fontSize: 11, fontWeight: 600 },
      },
      meta: { tipo: 'actor', titulo: a.nombre, detalle: a.descripcion } satisfies CellMeta,
    })
    cells.push(el)
    if (portal) {
      const fan = actores.length === 1 ? 0 : -70 + (140 * i) / Math.max(1, actores.length - 1)
      links.push(linkDown(shapes, el.id, portal.id, '#6b6280', { dashed: true, targetDx: fan }))
    }
  })

  const extX = contextX + actorSpan + (actorSpan ? GROUP_GAP : 0)
  externos.forEach((ex: { nombre: string; descripcion?: string }, i: number) => {
    const el = new shapes.standard.Rectangle({
      position: { x: extX + i * (NODE_W + GAP), y: actorY },
      size: { width: NODE_W, height: NODE_H },
      attrs: {
        body: { fill: EXTERNAL_FILL, stroke: '#ef6c00', strokeWidth: 1.5, rx: 8 },
        label: { text: lineWrap(ex.nombre, 22, 2), fill: '#333', fontSize: 10, fontWeight: 600 },
      },
      meta: { tipo: 'externo', titulo: ex.nombre, detalle: ex.descripcion } satisfies CellMeta,
    })
    cells.push(el)
    if (edge) {
      if (portal && portal.id === edge.id) {
        links.push(linkOutUp(shapes, edge.id, el.id, '#ef6c00'))
      } else {
        const fan = externos.length === 1 ? 36 : -40 + (80 * i) / Math.max(1, externos.length - 1)
        links.push(linkUp(shapes, edge.id, el.id, '#ef6c00', { targetDx: fan }))
      }
    }
  })

  if (visibleIds.length > 0) {
    const cols = Math.min(svcCols, visibleIds.length)
    const gridX = rowStart(MARGIN, cloudWidth, cols, svcW, svcGap)
    cells.push(
      new shapes.standard.Rectangle({
        position: { x: MARGIN + 20, y: svcTop - 22 },
        size: { width: 160, height: 16 },
        attrs: {
          body: { fill: 'transparent', stroke: 'transparent' },
          label: { text: 'Servicios de la plataforma', fill: '#2e7d32', fontSize: 10, fontWeight: 700, refX: 0 },
        },
        meta: { tipo: 'decoracion', titulo: 'Servicios' } satisfies CellMeta,
      })
    )

    const serviceEls: shapes.standard.Rectangle[] = []
    visibleIds.forEach((id: string, i: number) => {
      const s = servicioPorId(id) as { nombre?: string; descripcion?: string; capacidad?: string } | undefined
      const name = s?.nombre || id
      const col = i % cols
      const row = Math.floor(i / cols)
      const el = new shapes.standard.Rectangle({
        position: { x: gridX + col * (svcW + svcGap), y: svcTop + row * (svcH + svcGap) },
        size: { width: svcW, height: svcH },
        attrs: {
          body: { fill: SERVICE_FILL, stroke: '#43a047', strokeWidth: 1, rx: 6 },
          label: { text: lineWrap(name, 18, 2), fill: '#1b5e20', fontSize: 10, lineHeight: 13 },
        },
        meta: {
          tipo: 'servicio',
          titulo: name,
          detalle: [s?.capacidad, s?.descripcion].filter(Boolean).join(' · '),
        } satisfies CellMeta,
      })
      serviceEls.push(el)
      cells.push(el)
    })

    const owner = bloqueElements[Math.floor((bloqueElements.length - 1) / 2)]
    if (owner && serviceEls.length) {
      const mid = serviceEls[Math.floor((Math.min(cols, serviceEls.length) - 1) / 2)]
      links.push(linkDown(shapes, owner.id, mid.id, '#66bb6a', { dashed: true }))
    }
  }

  return { cells: [...cells, ...links], width, height }
}