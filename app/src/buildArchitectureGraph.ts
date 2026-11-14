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

function linkBetween(
  shapes: GraphShapes,
  sourceId: dia.Cell.ID,
  targetId: dia.Cell.ID,
  stroke: string,
  opts?: { dashed?: boolean; width?: number }
) {
  return new shapes.standard.Link({
    source: { id: sourceId, anchor: { name: 'bottom' }, connectionPoint: { name: 'anchor' } },
    target: { id: targetId, anchor: { name: 'top' }, connectionPoint: { name: 'anchor' } },
    router: { name: 'manhattan', args: { padding: 16, step: 12 } },
    connector: { name: 'rounded', args: { radius: 6 } },
    attrs: {
      line: {
        stroke,
        strokeWidth: opts?.width ?? 1.8,
        strokeDasharray: opts?.dashed ? '6 4' : undefined,
        targetMarker: { type: 'path', fill: stroke, d: 'M 8 -4 0 0 8 4 Z' },
      },
    },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildArchitectureGraph(doc: any, shapes: GraphShapes): GraphBuildResult {
  const cells: dia.Cell[] = []
  const links: dia.Cell[] = []

  const NODE_W = 164
  const NODE_H = 68
  const GAP = 20
  const MARGIN = 40

  const actores = (doc.arc42?.contexto?.actores || []).filter((a: { nombre?: string }) => (a.nombre || '').trim())
  const externos = (doc.arc42?.contexto?.sistemasExternos || []).filter((a: { nombre?: string }) =>
    (a.nombre || '').trim()
  )
  const bloques = (doc.arc42?.bloques || []).filter((b: { nombre?: string }) => (b.nombre || '').trim())
  const servicioIds: string[] = doc.nube?.serviciosSeleccionados || []
  const proveedor = (doc.meta?.proveedorNube || 'aws').toUpperCase()
  const proyecto = (doc.meta?.nombreProyecto || 'Sistema').trim()

  const svcW = 124
  const svcH = 40
  const visibleIds = servicioIds.slice(0, 18)
  const svcCols = Math.min(8, Math.max(3, Math.ceil(Math.sqrt(visibleIds.length)) || 1))
  const svcRows = Math.ceil(visibleIds.length / svcCols) || 0

  const contextCols = Math.max(actores.length, externos.length, 1)
  const bloqueCols = Math.max(bloques.length, 1)
  const innerWidth =
    Math.max(
      contextCols * (NODE_W + GAP),
      bloqueCols * (NODE_W + GAP),
      svcCols * (svcW + 12)
    ) + 80

  const cloudWidth = innerWidth + 48
  const cloudTop = 188
  const c4Band = 100
  const svcBand = svcRows > 0 ? svcRows * (svcH + 10) + 56 : 0
  const cloudHeight = c4Band + svcBand + 48

  cells.push(laneLabel(shapes, MARGIN, 88, 'Contexto'))
  cells.push(laneLabel(shapes, MARGIN, cloudTop - 28, 'Plataforma en nube'))

  if (proyecto) {
    cells.push(
      new shapes.standard.Rectangle({
        position: { x: MARGIN, y: 24 },
        size: { width: cloudWidth, height: 36 },
        attrs: {
          body: { fill: 'transparent', stroke: 'transparent' },
          label: {
            text: proyecto,
            fill: '#111',
            fontSize: 16,
            fontWeight: 700,
            refX: 0,
            refY: '50%',
          },
        },
        meta: { tipo: 'decoracion', titulo: proyecto } satisfies CellMeta,
      })
    )
  }

  const cloud = new shapes.standard.Rectangle({
    position: { x: MARGIN, y: cloudTop },
    size: { width: cloudWidth, height: cloudHeight },
    attrs: {
      body: {
        fill: '#faf8ff',
        stroke: PRIMARY,
        strokeWidth: 2,
        strokeDasharray: '10 5',
        rx: 12,
        ry: 12,
        filter: { name: 'dropShadow', args: { dx: 0, dy: 2, blur: 6, color: 'rgba(95,39,205,0.12)' } },
      },
      label: {
        text: `Nube · ${proveedor}`,
        fill: PRIMARY,
        fontSize: 11,
        fontWeight: 600,
        refX: '50%',
        refY: 18,
        textAnchor: 'middle',
      },
    },
    meta: { tipo: 'decoracion', titulo: `Nube ${proveedor}` } satisfies CellMeta,
  })
  cells.push(cloud)

  const bloqueY = cloudTop + 44
  const bloqueStartX = MARGIN + 24
  const bloqueElements: shapes.standard.Rectangle[] = []

  bloques.forEach((b: { nombre: string; responsabilidad?: string; tecnologia?: string }, i: number) => {
    const sub = b.tecnologia || lineWrap(b.responsabilidad || '', 28, 2)
    const label = sub ? `${b.nombre}\n${sub}` : b.nombre
    const el = new shapes.standard.Rectangle({
      position: { x: bloqueStartX + i * (NODE_W + GAP), y: bloqueY },
      size: { width: NODE_W, height: NODE_H },
      attrs: {
        body: {
          fill: PRIMARY,
          stroke: PRIMARY_DARK,
          strokeWidth: 1.5,
          rx: 8,
          ry: 8,
          filter: { name: 'dropShadow', args: { dx: 0, dy: 3, blur: 4, color: 'rgba(74,31,168,0.35)' } },
        },
        label: {
          text: lineWrap(label, 30, 3),
          fill: PRIMARY_TEXT,
          fontSize: 10,
          fontWeight: 600,
          lineHeight: 14,
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
        position: { x: bloqueStartX, y: bloqueY },
        size: { width: 320, height: NODE_H },
        attrs: {
          body: { fill: '#f5f5f5', stroke: '#ccc', strokeDasharray: '6 4', rx: 8 },
          label: {
            text: 'Añade contenedores C4\nen «Estrategia y bloques»',
            fill: '#555',
            fontSize: 11,
            lineHeight: 14,
          },
        },
        meta: { tipo: 'decoracion', titulo: 'Sin contenedores' } satisfies CellMeta,
      })
    )
  }

  for (let i = 0; i < bloqueElements.length - 1; i++) {
    links.push(linkBetween(shapes, bloqueElements[i].id, bloqueElements[i + 1].id, PRIMARY, { width: 2.2 }))
  }

  const actorY = 112
  const actorStartX = bloqueStartX
  const portalId = bloqueElements[0]?.id

  actores.forEach((a: { nombre: string; descripcion?: string }, i: number) => {
    const el = new shapes.standard.Ellipse({
      position: { x: actorStartX + i * (NODE_W + GAP), y: actorY },
      size: { width: NODE_W, height: NODE_H - 4 },
      attrs: {
        body: {
          fill: ACTOR_FILL,
          stroke: PRIMARY,
          strokeWidth: 1.5,
          filter: { name: 'dropShadow', args: { dx: 0, dy: 2, blur: 3, color: 'rgba(95,39,205,0.15)' } },
        },
        label: { text: a.nombre, fill: '#111', fontSize: 11, fontWeight: 600 },
      },
      meta: {
        tipo: 'actor',
        titulo: a.nombre,
        detalle: a.descripcion,
      } satisfies CellMeta,
    })
    cells.push(el)
    if (portalId) links.push(linkBetween(shapes, el.id, portalId, '#6b6b6b', { dashed: true, width: 1.5 }))
  })

  const extStartX = MARGIN + cloudWidth - 24 - NODE_W - (externos.length - 1) * (NODE_W + GAP)
  externos.forEach((ex: { nombre: string; descripcion?: string }, i: number) => {
    const x = Math.max(extStartX + i * (NODE_W + GAP), actorStartX + actores.length * (NODE_W + GAP) + GAP)
    const el = new shapes.standard.Rectangle({
      position: { x, y: actorY },
      size: { width: NODE_W, height: NODE_H - 4 },
      attrs: {
        body: { fill: EXTERNAL_FILL, stroke: '#ef6c00', strokeWidth: 1.5, rx: 8 },
        label: { text: lineWrap(ex.nombre, 24, 2), fill: '#333', fontSize: 10, fontWeight: 500 },
      },
      meta: {
        tipo: 'externo',
        titulo: ex.nombre,
        detalle: ex.descripcion,
      } satisfies CellMeta,
    })
    cells.push(el)
    const back = bloqueElements[bloqueElements.length - 1]
    if (back) links.push(linkBetween(shapes, back.id, el.id, '#ef6c00', { dashed: true, width: 1.5 }))
  })

  if (visibleIds.length > 0) {
    const svcLabelY = cloudTop + cloudHeight - svcBand + 8
    cells.push(
      new shapes.standard.Rectangle({
        position: { x: MARGIN + 20, y: svcLabelY },
        size: { width: 120, height: 18 },
        attrs: {
          body: { fill: 'transparent', stroke: 'transparent' },
          label: { text: 'Servicios', fill: '#2e7d32', fontSize: 10, fontWeight: 700, refX: 0, refY: '50%' },
        },
        meta: { tipo: 'decoracion', titulo: 'Servicios' } satisfies CellMeta,
      })
    )

    const svcBaseY = svcLabelY + 24
    visibleIds.forEach((id: string, i: number) => {
      const s = servicioPorId(id) as { nombre?: string; descripcion?: string; capacidad?: string } | undefined
      const name = s?.nombre || id
      const col = i % svcCols
      const row = Math.floor(i / svcCols)
      const el = new shapes.standard.Rectangle({
        position: { x: bloqueStartX + col * (svcW + 12), y: svcBaseY + row * (svcH + 10) },
        size: { width: svcW, height: svcH },
        attrs: {
          body: { fill: SERVICE_FILL, stroke: '#43a047', strokeWidth: 1, rx: 6 },
          label: { text: lineWrap(name, 18, 2), fill: '#1b5e20', fontSize: 9, lineHeight: 12 },
        },
        meta: {
          tipo: 'servicio',
          titulo: name,
          detalle: [s?.capacidad, s?.descripcion].filter(Boolean).join(' · '),
        } satisfies CellMeta,
      })
      cells.push(el)
    })

    const hub = bloqueElements[Math.floor(bloqueElements.length / 2)] ?? bloqueElements[0]
    if (hub) {
      const svcHub = visibleIds.length > 0 ? cells.find((c) => (c as dia.Element).get('meta')?.tipo === 'servicio') : null
      if (svcHub && 'id' in svcHub) {
        links.push(linkBetween(shapes, hub.id, svcHub.id as string, '#81c784', { dashed: true, width: 1.2 }))
      }
    }
  }

  const legendX = MARGIN + cloudWidth - 210
  cells.push(
    new shapes.standard.Rectangle({
      position: { x: Math.max(legendX, MARGIN + 280), y: 28 },
      size: { width: 200, height: 58 },
      attrs: {
        body: { fill: '#ffffff', stroke: '#e5e5e5', rx: 8 },
        label: {
          text: '● Actor / usuario\n■ Contenedor C4  ■ Sistema externo\n■ Servicio de nube (catálogo)',
          fill: '#444',
          fontSize: 9,
          refX: 10,
          refY: 10,
          textAnchor: 'start',
          textVerticalAnchor: 'top',
          lineHeight: 13,
        },
      },
      meta: { tipo: 'decoracion', titulo: 'Leyenda' } satisfies CellMeta,
    })
  )

  const width = MARGIN * 2 + cloudWidth
  const height = cloudTop + cloudHeight + MARGIN + 24

  return { cells: [...cells, ...links], width, height }
}