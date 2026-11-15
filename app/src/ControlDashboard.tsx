import {
  ArrowRight,
  Cloud,
  FileText,
  Gauge,
  Eye,
  Loader2,
  LayoutDashboard,
  Network,
  Puzzle,
  Shield,
  Sparkles,
  Target,
  TriangleAlert,
} from 'lucide-react'
import { servicioPorId, serviciosPorProveedor } from '@nucleo/catalogos-store.js'
import { ProviderBadge } from './ui'

type DocLike = {
  meta?: {
    nombreProyecto?: string
    proveedorNube?: string
    autor?: string
    fecha?: string
  }
  arc42?: {
    introduccion?: { vision?: string; metas?: string[] }
    restricciones?: string[]
    escenariosCalidad?: unknown[]
    estrategia?: { resumen?: string; decisionesClave?: string[] }
    bloques?: { nombre?: string; responsabilidad?: string; tecnologia?: string }[]
    decisiones?: { id?: string; titulo?: string; estado?: string }[]
    riesgos?: { titulo?: string; severidad?: string; relacionControl?: string }[]
    despliegue?: { entornos?: string[]; topologia?: string }
  }
  nube?: { serviciosSeleccionados?: string[] }
  patrones?: { id: string; nombre: string; estado?: string }[]
  antipatrones?: { id: string; nombre: string; estado?: string }[]
  evaluacionWellArchitected?: { pilares?: { pilar: string; controles?: { estado: string }[] }[] }
}

type Validation = { valido: boolean; errores: string[]; advertencias: string[] }

export type EvalResumenDashboard = {
  cumple: number
  parcial: number
  brecha: number
  noAplica: number
  brechasCriticas: { pilar: string; control: string; texto?: string; brecha?: string }[]
}

const CAP_LABELS: Record<string, string> = {
  compute: 'Cómputo',
  integracion: 'Integración',
  datos: 'Datos',
  identidad: 'Identidad',
  red: 'Red',
  seguridad: 'Seguridad',
  observabilidad: 'Observabilidad',
}

function labelPilar(id: string) {
  return id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string | number
  hint?: string
  tone?: 'default' | 'success' | 'warning' | 'error'
}) {
  const ring =
    tone === 'success'
      ? 'border-success/30 bg-success/5'
      : tone === 'warning'
        ? 'border-warning/30 bg-warning/5'
        : tone === 'error'
          ? 'border-error/30 bg-error/5'
          : 'border-base-300 bg-base-100'
  return (
    <article className={`min-w-0 overflow-hidden rounded-xl border p-3 shadow-sm ${ring}`}>
      <p className="break-words text-[10px] font-bold uppercase leading-tight tracking-normal text-base-content/50">{label}</p>
      <p className="mt-0.5 break-words text-lg font-semibold leading-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 line-clamp-2 break-words text-[11px] leading-snug text-base-content/55">{hint}</p> : null}
    </article>
  )
}

function Panel({
  title,
  icon: Icon,
  step,
  onGoStep,
  children,
}: {
  title: string
  icon: typeof Target
  step: number
  onGoStep: (n: number) => void
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-base-300 bg-base-100 shadow-sm overflow-hidden flex flex-col min-h-0 h-full">
      <header className="flex items-center justify-between gap-1.5 border-b border-base-200 px-3 py-2 bg-base-200/30">
        <h3 className="text-xs font-semibold inline-flex items-center gap-1.5 min-w-0">
          <Icon className="size-3.5 text-primary shrink-0" aria-hidden />
          <span className="truncate">{title}</span>
        </h3>
        <button type="button" className="btn btn-ghost btn-xs shrink-0 gap-0.5 min-h-0 h-7" onClick={() => onGoStep(step)}>
          Editar
          <ArrowRight className="size-3" aria-hidden />
        </button>
      </header>
      <div className="p-3 text-xs leading-snug text-base-content/80 flex-1 min-h-0">{children}</div>
    </section>
  )
}

export function ControlDashboard({
  doc,
  validation,
  evalResumen,
  sugerenciasTotal,
  revisionesCount,
  perfilLabels,
  proveedor,
  onGoStep,
  onOpenSugerencias,
  onOpenVisor,
  onVerConsolidadoPdf,
  generandoConsolidadoPdf,
}: {
  doc: DocLike
  validation: Validation
  evalResumen: EvalResumenDashboard
  sugerenciasTotal: number
  revisionesCount: number
  perfilLabels: string[]
  proveedor: string
  onGoStep: (step: number) => void
  onOpenSugerencias: () => void
  onOpenVisor: () => void
  onVerConsolidadoPdf: () => void
  generandoConsolidadoPdf?: boolean
}) {
  const meta = doc.meta || {}
  const arc = doc.arc42 || {}
  const metas = (arc.introduccion?.metas || []).filter(Boolean)
  const vision = (arc.introduccion?.vision || '').trim()
  const restricciones = (arc.restricciones || []).filter(Boolean)
  const escenarios = (arc.escenariosCalidad || []).filter(
    (e) => e && typeof e === 'object' && (e as { nombre?: string }).nombre?.trim(),
  )
  const bloques = (arc.bloques || []).filter((b) => b.nombre?.trim())
  const adrs = (arc.decisiones || []).filter((d) => d.titulo?.trim() || d.id?.trim())
  const riesgos = arc.riesgos || []
  const svcIds = doc.nube?.serviciosSeleccionados || []
  const patrones = doc.patrones || []
  const antipatrones = doc.antipatrones || []
  const adoptados = patrones.filter((p) => p.estado === 'adoptado').length
  const wafTotal = evalResumen.cumple + evalResumen.parcial + evalResumen.brecha + evalResumen.noAplica
  const wafEvaluados = evalResumen.cumple + evalResumen.parcial + evalResumen.brecha
  const wafPct = wafEvaluados > 0 ? Math.round((evalResumen.cumple / wafEvaluados) * 100) : null

  const serviciosSel = svcIds
    .map((id) => servicioPorId(id))
    .filter(Boolean) as { id: string; nombre: string; capacidad?: string; proveedor?: string }[]

  const porCapacidad = new Map<string, typeof serviciosSel>()
  for (const s of serviciosSel) {
    const cap = s.capacidad || 'otros'
    const list = porCapacidad.get(cap) || []
    list.push(s)
    porCapacidad.set(cap, list)
  }

  const riesgoAlto = riesgos.filter((r) => r.severidad === 'alta' || r.severidad === 'critica').length
  const adrAceptados = adrs.filter((a) => a.estado === 'aceptada' || a.estado === 'aceptado').length

  const entornos = (arc.despliegue?.entornos || []).filter(Boolean)

  return (
    <div className="grid gap-3 w-full min-w-0 sm:grid-cols-2 lg:grid-cols-3">
      <header className="relative overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 via-base-100 to-base-100 p-4 shadow-sm sm:col-span-2 lg:col-span-3">
        <DecoBlur />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/90 flex items-center gap-1.5">
              <LayoutDashboard className="size-3" aria-hidden />
              Consolidado
            </p>
            <h2 className="text-lg font-semibold mt-0.5 truncate">
              {meta.nombreProyecto?.trim() || 'Proyecto sin nombre'}
            </h2>
            <p className="text-xs text-base-content/65 mt-1 flex flex-wrap items-center gap-1.5">
              <ProviderBadge proveedor={proveedor} />
              {meta.autor?.trim() ? <span>· {meta.autor}</span> : null}
              {meta.fecha ? <span className="text-base-content/45">· {meta.fecha}</span> : null}
            </p>
          </div>
          <div
            className={`alert py-1.5 px-2.5 text-xs max-w-sm shrink-0 ${
              validation.valido ? 'alert-success' : 'alert-warning'
            }`}
            role="status"
          >
            {validation.valido ? (
              <span>Sin errores bloqueantes.</span>
            ) : (
              <span>
                {validation.errores.length} error(es), {validation.advertencias.length} aviso(s).
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:col-span-2 lg:col-span-3">
        <StatCard label="Servicios" value={svcIds.length} hint={`${porCapacidad.size} capacidades`} />
        <StatCard
          label="Patrones"
          value={patrones.length}
          hint={adoptados > 0 ? `${adoptados} adoptado(s)` : 'Paso 7'}
        />
        <StatCard
          label="ADRs · Riesgos"
          value={`${adrs.length} · ${riesgos.length}`}
          hint={riesgoAlto > 0 ? `${riesgoAlto} alto/crítico` : 'OK'}
          tone={riesgoAlto > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Well-Architected"
          value={wafPct !== null ? `${wafPct}%` : '—'}
          hint={
            wafTotal > 0
              ? `${evalResumen.brecha} brecha · ${evalResumen.parcial} parcial`
              : 'Sin evaluar'
          }
          tone={evalResumen.brecha > 0 ? 'warning' : evalResumen.cumple > 0 ? 'success' : 'default'}
        />
      </div>

      <Panel title="Alcance y contexto" icon={Target} step={0} onGoStep={onGoStep}>
          {vision ? (
            <p className="line-clamp-2 mb-2">{vision}</p>
          ) : (
            <p className="text-base-content/50 italic mb-2">Sin visión.</p>
          )}
          <ul className="space-y-0.5 text-base-content/70">
            <li>
              <strong>{metas.length}</strong> meta(s) · <strong>{restricciones.length}</strong> restricción(es)
            </li>
            <li>
              <strong>{perfilLabels.length}</strong> rasgo(s) de negocio activos
            </li>
            {perfilLabels.length > 0 ? (
              <li className="flex flex-wrap gap-1 mt-2">
                {perfilLabels.slice(0, 5).map((l) => (
                  <span key={l} className="badge badge-xs badge-outline">
                    {l}
                  </span>
                ))}
                {perfilLabels.length > 5 ? (
                  <span className="badge badge-xs">+{perfilLabels.length - 5}</span>
                ) : null}
              </li>
            ) : null}
          </ul>
          <button type="button" className="btn btn-link btn-xs px-0 mt-1 h-auto min-h-0" onClick={() => onGoStep(1)}>
            Perfil
          </button>
        </Panel>

        <Panel title="Calidad y bloques" icon={Gauge} step={2} onGoStep={onGoStep}>
          <p className="mb-2">
            <strong>{escenarios.length}</strong> escenario(s) de calidad · <strong>{bloques.length}</strong> bloque(s)
            de construcción
          </p>
          {bloques.length > 0 ? (
            <ul className="space-y-1 mt-1.5">
              {bloques.slice(0, 3).map((b, i) => (
                <li key={i} className="rounded-md border border-base-200 px-2 py-1.5 bg-base-200/20">
                  <p className="font-medium text-base-content truncate">{b.nombre}</p>
                  {b.tecnologia ? <p className="text-[11px] text-base-content/55 truncate">{b.tecnologia}</p> : null}
                </li>
              ))}
              {bloques.length > 3 ? (
                <li className="text-[11px] text-base-content/50">+{bloques.length - 3} más</li>
              ) : null}
            </ul>
          ) : (
            <p className="text-base-content/50 italic">Aún no hay bloques nombrados.</p>
          )}
          {arc.estrategia?.resumen?.trim() ? (
            <p className="mt-2 text-[11px] text-base-content/65 line-clamp-2 border-t border-base-200 pt-2">
              {arc.estrategia.resumen}
            </p>
          ) : null}
        </Panel>

        <Panel title="Nube y servicios" icon={Cloud} step={5} onGoStep={onGoStep}>
          {serviciosSel.length === 0 ? (
            <p className="text-base-content/50 italic">Ningún servicio seleccionado.</p>
          ) : (
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {[...porCapacidad.entries()].map(([cap, items]) => (
                <div key={cap}>
                  <p className="text-xs font-semibold uppercase text-base-content/50 mb-1">
                    {CAP_LABELS[cap] || cap}
                  </p>
                  <ul className="flex flex-wrap gap-1">
                    {items.map((s) => (
                      <span key={s.id} className="badge badge-sm badge-ghost font-normal">
                        {s.nombre}
                      </span>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-base-content/55 mt-2">
            {serviciosPorProveedor(proveedor).length} en catálogo {proveedor.toUpperCase()}.
          </p>
        </Panel>

        <Panel title="Patrones y antipatrones" icon={Puzzle} step={6} onGoStep={onGoStep}>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="badge badge-primary badge-outline">{patrones.length} patrones</span>
            <span className="badge badge-warning badge-outline">{antipatrones.length} antipatrones</span>
          </div>
          {patrones.length > 0 ? (
            <ul className="space-y-0.5 max-h-24 overflow-y-auto">
              {patrones.slice(0, 4).map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <span className="truncate">{p.nombre}</span>
                  <span className="badge badge-xs shrink-0">{p.estado || 'sugerido'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base-content/50 italic text-xs">Usa Sugerencias para fusionar el catálogo.</p>
          )}
          {antipatrones.length > 0 ? (
            <ul className="mt-2 pt-2 border-t border-base-200 space-y-0.5 text-warning/90 max-h-16 overflow-y-auto">
              {antipatrones.slice(0, 3).map((a) => (
                <li key={a.id} className="truncate">
                  {a.nombre}
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>

        <Panel title="Well-Architected" icon={Shield} step={7} onGoStep={onGoStep}>
          {wafTotal === 0 ? (
            <p className="text-base-content/50 italic">Evaluación sin controles cargados.</p>
          ) : (
            <>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-base-200 mb-2">
                {evalResumen.cumple > 0 ? (
                  <div
                    className="bg-success h-full"
                    style={{ width: `${(evalResumen.cumple / wafTotal) * 100}%` }}
                    title="Cumple"
                  />
                ) : null}
                {evalResumen.parcial > 0 ? (
                  <div
                    className="bg-warning h-full"
                    style={{ width: `${(evalResumen.parcial / wafTotal) * 100}%` }}
                    title="Parcial"
                  />
                ) : null}
                {evalResumen.brecha > 0 ? (
                  <div
                    className="bg-error h-full"
                    style={{ width: `${(evalResumen.brecha / wafTotal) * 100}%` }}
                    title="Brecha"
                  />
                ) : null}
              </div>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <li>Cumple: {evalResumen.cumple}</li>
                <li>Parcial: {evalResumen.parcial}</li>
                <li>Brecha: {evalResumen.brecha}</li>
                <li>No aplica: {evalResumen.noAplica}</li>
              </ul>
              {evalResumen.brechasCriticas.length > 0 ? (
                <ul className="mt-2 space-y-0.5 border-t border-base-200 pt-2 max-h-20 overflow-y-auto">
                  {evalResumen.brechasCriticas.slice(0, 3).map((b, i) => (
                    <li key={i}>
                      <span className="font-medium">{labelPilar(b.pilar)}</span> — {b.control}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </Panel>

        <Panel title="ADRs y riesgos" icon={TriangleAlert} step={8} onGoStep={onGoStep}>
          <p className="mb-2">
            <strong>{adrs.length}</strong> ADR(s)
            {adrAceptados > 0 ? ` (${adrAceptados} aceptada(s))` : ''} · <strong>{riesgos.length}</strong> riesgo(s)
          </p>
          {entornos.length > 0 ? (
            <p className="text-xs text-base-content/65 mb-2">
              Entornos: {entornos.join(', ')}
            </p>
          ) : null}
          {riesgos.length > 0 ? (
            <ul className="space-y-0.5 max-h-24 overflow-y-auto">
              {riesgos.slice(0, 4).map((r, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className={`badge badge-xs shrink-0 ${r.severidad === 'alta' || r.severidad === 'critica' ? 'badge-error' : 'badge-ghost'}`}>
                    {r.severidad || '—'}
                  </span>
                  <span className="truncate">{r.titulo || 'Sin título'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base-content/50 italic text-xs">Sin riesgos registrados.</p>
          )}
        </Panel>

      <section className="rounded-xl border border-dashed border-base-300 p-3 bg-base-200/20 sm:col-span-2 lg:col-span-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h3 className="text-xs font-semibold shrink-0">Acciones</h3>
          <div className="flex flex-wrap gap-1.5 flex-1">
          <button
            type="button"
            className="btn btn-sm btn-primary gap-2"
            disabled={generandoConsolidadoPdf}
            onClick={onVerConsolidadoPdf}
          >
            {generandoConsolidadoPdf ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
            {generandoConsolidadoPdf ? 'Generando…' : 'Ver consolidado (PDF)'}
          </button>
          <button type="button" className="btn btn-sm btn-outline gap-2" onClick={() => onGoStep(9)}>
            <Network className="size-4" aria-hidden />
            Diagrama
          </button>
          <button type="button" className="btn btn-sm btn-outline gap-2" onClick={() => onGoStep(10)}>
            <FileText className="size-4" aria-hidden />
            Validar y exportar
          </button>
          <button type="button" className="btn btn-sm btn-outline gap-2" onClick={onOpenVisor}>
            Visor arc42
          </button>
          <button type="button" className="btn btn-sm btn-outline gap-2" onClick={onOpenSugerencias}>
            <Sparkles className="size-4" aria-hidden />
            Sugerencias
            {sugerenciasTotal > 0 ? (
              <span className="badge badge-sm badge-neutral">{sugerenciasTotal}</span>
            ) : null}
          </button>
          </div>
        </div>
        {revisionesCount > 0 ? (
          <p className="text-[11px] text-base-content/55 mt-2">
            <strong>{revisionesCount}</strong> aviso(s) de revisión en formularios.
          </p>
        ) : null}
      </section>
    </div>
  )
}

function DecoBlur() {
  return (
    <div
      className="absolute -right-12 -top-16 size-48 rounded-full bg-primary/[0.07] blur-2xl pointer-events-none"
      aria-hidden
    />
  )
}