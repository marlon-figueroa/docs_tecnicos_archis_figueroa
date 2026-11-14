import { useEffect, useMemo, useRef, useState } from 'react'
import { ZoomIn, ZoomOut, Maximize2, Hand, Download } from 'lucide-react'
import type { dia, shapes as JointShapes } from '@joint/core'
import type { CellMeta } from './buildArchitectureGraph'
import { buildArchitectureGraph } from './buildArchitectureGraph'
import { ensurePtSans, ptSansSvgCss } from './ptSansFont'

type RectLike = { x: number; y: number; width: number; height: number }

function unionSvgBBox(nodes: SVGGraphicsElement[]): RectLike | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const node of nodes) {
    const box = node.getBBox()
    if (!Number.isFinite(box.x) || (!box.width && !box.height)) continue
    minX = Math.min(minX, box.x)
    minY = Math.min(minY, box.y)
    maxX = Math.max(maxX, box.x + box.width)
    maxY = Math.max(maxY, box.y + box.height)
  }
  if (!Number.isFinite(minX)) return null
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

function unionRects(a: RectLike, b: RectLike): RectLike {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  }
}

type ArchitectureDiagramProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any
}

export function ArchitectureDiagram({ doc }: ArchitectureDiagramProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<dia.Paper | null>(null)
  const graphRef = useRef<dia.Graph | null>(null)
  const shapesRef = useRef<typeof JointShapes | null>(null)
  const panRef = useRef({ active: false, x: 0, y: 0, tx: 0, ty: 0 })
  const scaleRef = useRef(1)
  const userAdjustedRef = useRef(false)
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [scale, setScale] = useState(1)
  const [ready, setReady] = useState(false)
  const [tooltip, setTooltip] = useState<CellMeta | null>(null)

  const diagramKey = useMemo(
    () =>
      JSON.stringify({
        proyecto: doc.meta?.nombreProyecto,
        proveedor: doc.meta?.proveedorNube,
        actores: doc.arc42?.contexto?.actores,
        externos: doc.arc42?.contexto?.sistemasExternos,
        bloques: doc.arc42?.bloques,
        servicios: doc.nube?.serviciosSeleccionados,
      }),
    [doc]
  )

  const fit = () => {
    const paper = paperRef.current
    const host = hostRef.current
    if (!paper || !host || host.clientWidth < 40 || host.clientHeight < 40) return
    if (!graphRef.current?.getCells().length) return

    paper.setDimensions(host.clientWidth, host.clientHeight)
    paper.scaleContentToFit({
      padding: 28,
      minScale: 0.15,
      maxScale: 1.15,
      useModelGeometry: true,
      horizontalAlign: 'middle',
      verticalAlign: 'middle',
    })
    const s = paper.scale().sx
    scaleRef.current = s
    setScale(s)
    userAdjustedRef.current = false
  }

  const downloadSvg = async () => {
    const paper = paperRef.current
    if (!paper || !graphRef.current?.getCells().length) return
    const fontCss = await ptSansSvgCss()

    // Coordenadas locales del modelo. getContentBBox está en píxeles del visor
    // (ya escalado) y recorta el archivo al encuadre de la pantalla.
    const model = paper.getContentArea({ useModelGeometry: true })
    const rendered = unionSvgBBox(
      ['.joint-back-layer', '.joint-labels-layer', '.joint-front-layer']
        .map((selector) => paper.svg.querySelector(selector))
        .filter((node): node is SVGGraphicsElement => node instanceof SVGGraphicsElement),
    )
    const bbox = rendered ? unionRects(model, rendered) : model
    if (!bbox.width || !bbox.height) return

    const pad = 48
    const x = bbox.x - pad
    const y = bbox.y - pad
    const width = bbox.width + pad * 2
    const height = bbox.height + pad * 2
    const clone = paper.svg.cloneNode(true) as SVGSVGElement
    clone.querySelector('.joint-grid-layer')?.remove()
    clone.querySelector('.joint-tools-layer')?.remove()
    clone.querySelector('.joint-layers')?.removeAttribute('transform')

    const svgNs = 'http://www.w3.org/2000/svg'
    const background = document.createElementNS(svgNs, 'rect')
    background.setAttribute('x', String(x))
    background.setAttribute('y', String(y))
    background.setAttribute('width', String(width))
    background.setAttribute('height', String(height))
    background.setAttribute('fill', '#fbf9ff')
    const fontStyle = document.createElementNS(svgNs, 'style')
    fontStyle.setAttribute('type', 'text/css')
    fontStyle.textContent = fontCss
    clone.querySelectorAll('text, tspan').forEach((node) => {
      node.setAttribute('font-family', 'PT Sans, sans-serif')
    })

    const defs = clone.querySelector('defs')
    if (defs) defs.prepend(fontStyle)
    else clone.prepend(fontStyle)
    if (defs?.nextSibling) clone.insertBefore(background, defs.nextSibling)
    else clone.insertBefore(background, clone.firstChild)

    clone.removeAttribute('style')
    clone.removeAttribute('id')
    clone.removeAttribute('joint-selector')
    clone.setAttribute('overflow', 'visible')
    clone.setAttribute('xmlns', svgNs)
    clone.setAttribute('width', String(Math.ceil(width)))
    clone.setAttribute('height', String(Math.ceil(height)))
    clone.setAttribute('viewBox', `${x} ${y} ${width} ${height}`)

    const nombre = String(doc.meta?.nombreProyecto || 'arquitectura')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'arquitectura'
    const blob = new Blob(
      [`<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`],
      { type: 'image/svg+xml;charset=utf-8' },
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${nombre}-arquitectura.svg`
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  const zoomBy = (factor: number) => {
    const paper = paperRef.current
    if (!paper) return
    const next = Math.min(2.5, Math.max(0.3, scaleRef.current * factor))
    paper.scale(next, next)
    scaleRef.current = next
    setScale(next)
    userAdjustedRef.current = true
  }

  useEffect(() => {
    let mounted = true

    void import('@joint/core').then(({ dia, shapes }) => {
      if (!mounted || !hostRef.current) return

      shapesRef.current = shapes
      const graph = new dia.Graph({}, { cellNamespace: shapes })
      graphRef.current = graph

      const host = hostRef.current
      const paper = new dia.Paper({
        el: host,
        model: graph,
        width: host.clientWidth || 720,
        height: host.clientHeight || 640,
        gridSize: 10,
        drawGrid: { name: 'dot', args: { color: '#ddd6f3', thickness: 1.2 } },
        background: { color: 'oklch(99.2% 0.006 300)' },
        interactive: { linkMove: false, elementMove: false, labelMove: false },
        cellViewNamespace: shapes,
        async: false,
        preventDefaultBlankAction: false,
      })

      paper.on('blank:pointerdown', () => setTooltip(null))

      let hoverId: string | null = null
      paper.on('element:pointerenter', (view) => {
        const meta = view.model.get('meta') as CellMeta | undefined
        if (!meta || meta.tipo === 'decoracion') return
        if (hoverId === view.model.id) return
        hoverId = String(view.model.id)
        setTooltip(meta)
      })

      paper.on('element:pointerleave', () => {
        hoverId = null
        setTooltip(null)
      })

      paperRef.current = paper
      setReady(true)
    })

    return () => {
      mounted = false
      paperRef.current?.remove()
      paperRef.current = null
      graphRef.current = null
      shapesRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    let frame = 0

    void ensurePtSans().then(() => {
      if (cancelled) return
      const graph = graphRef.current
      const shapes = shapesRef.current
      const paper = paperRef.current
      const host = hostRef.current
      if (!graph || !shapes || !paper || !host) return

      const { cells } = buildArchitectureGraph(doc, shapes)
      graph.resetCells(cells)
      userAdjustedRef.current = false
      frame = requestAnimationFrame(() => fit())
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
    // diagramKey resume los campos que cambian el grafo; ready evita pintar antes de JointJS
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramKey, ready])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !ready) return

    const onWheel = (e: WheelEvent) => {
      if (!paperRef.current || (!e.ctrlKey && !e.metaKey)) return
      e.preventDefault()
      zoomBy(e.deltaY > 0 ? 0.92 : 1.08)
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || !paperRef.current) return
      const target = e.target as Element
      if (target.closest('button') || target.closest('.joint-element')) return
      panRef.current = {
        active: true,
        x: e.clientX,
        y: e.clientY,
        tx: paperRef.current.translate().tx,
        ty: paperRef.current.translate().ty,
      }
      userAdjustedRef.current = true
      host.setPointerCapture(e.pointerId)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!panRef.current.active || !paperRef.current) return
      const dx = e.clientX - panRef.current.x
      const dy = e.clientY - panRef.current.y
      paperRef.current.translate(panRef.current.tx + dx, panRef.current.ty + dy)
    }

    const endPan = (e: PointerEvent) => {
      panRef.current.active = false
      try {
        host.releasePointerCapture(e.pointerId)
      } catch {
        /* ya liberado */
      }
    }

    host.addEventListener('wheel', onWheel, { passive: false })
    host.addEventListener('pointerdown', onPointerDown)
    host.addEventListener('pointermove', onPointerMove)
    host.addEventListener('pointerup', endPan)
    host.addEventListener('pointercancel', endPan)

    const ro = new ResizeObserver(() => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
      resizeTimerRef.current = setTimeout(() => {
        const paper = paperRef.current
        const viewport = hostRef.current
        if (!paper || !viewport) return
        paper.setDimensions(viewport.clientWidth, viewport.clientHeight)
        if (!userAdjustedRef.current) fit()
      }, 80)
    })
    ro.observe(host)

    return () => {
      host.removeEventListener('wheel', onWheel)
      host.removeEventListener('pointerdown', onPointerDown)
      host.removeEventListener('pointermove', onPointerMove)
      host.removeEventListener('pointerup', endPan)
      host.removeEventListener('pointercancel', endPan)
      ro.disconnect()
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
    }
  }, [ready])

  return (
    <div ref={wrapRef} className="w-full min-w-0 rounded-xl border border-base-300 bg-base-100 overflow-hidden flex flex-col shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-base-200 bg-base-200/50">
        <div className="min-w-0">
          <p className="text-sm font-medium text-base-content">Diagrama de arquitectura</p>
          <p className="text-xs text-base-content/60">
            Arrastra para mover · Ctrl+rueda para zoom · Pasa el cursor para ver detalle
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs tabular-nums text-base-content/50 min-w-[3rem] text-right">{Math.round(scale * 100)}%</span>
          <div className="join">
            <button type="button" className="btn btn-xs join-item gap-1" title="Alejar" onClick={() => zoomBy(0.9)} disabled={!ready}>
              <ZoomOut className="size-3.5" aria-hidden />
            </button>
            <button type="button" className="btn btn-xs join-item gap-1" title="Acercar" onClick={() => zoomBy(1.1)} disabled={!ready}>
              <ZoomIn className="size-3.5" aria-hidden />
            </button>
            <button type="button" className="btn btn-xs join-item gap-1" title="Centrar" onClick={fit} disabled={!ready}>
              <Maximize2 className="size-3.5" aria-hidden />
            </button>
          </div>
          <button type="button" className="btn btn-xs gap-1" title="Descargar SVG" onClick={() => void downloadSvg()} disabled={!ready}>
            <Download className="size-3.5" aria-hidden />
            SVG
          </button>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-base-content/45">
            <Hand className="size-3.5" aria-hidden />
            Pan
          </span>
        </div>
      </div>

      <div className="relative h-[70vh] min-h-[32rem] bg-[oklch(99.2%_0.006_300)]">
        <div
          ref={hostRef}
          className="absolute inset-0 cursor-grab active:cursor-grabbing overflow-hidden joint-host touch-none"
          aria-label="Diagrama de arquitectura interactivo"
        />
        {!ready ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-base-content/55">Cargando diagrama…</p>
        ) : null}
        {tooltip ? (
          <div
            className="absolute left-4 bottom-4 z-10 max-w-sm rounded-lg border border-primary/25 bg-base-100 px-3 py-2 shadow-md pointer-events-none"
            role="status"
          >
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">{tooltip.tipo}</p>
            <p className="text-sm font-medium text-base-content mt-0.5">{tooltip.titulo}</p>
            {tooltip.detalle ? (
              <p className="text-xs text-base-content/70 mt-1 leading-relaxed">{tooltip.detalle}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}