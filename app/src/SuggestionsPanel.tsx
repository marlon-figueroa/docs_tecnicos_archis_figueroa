import {
  AlertTriangle,
  Check,
  ClipboardList,
  Cloud,
  Lightbulb,
  Puzzle,
  Sparkles,
  X,
} from 'lucide-react'
import { ProviderBadge } from './ui'

export type RevisionFormulario = {
  id: string
  paso: number
  nivel: 'faltante' | 'incompleto' | 'contenido'
  mensaje: string
}

export type SugerenciasPreview = {
  patrones: { id: string; nombre: string; cuando?: string; [key: string]: unknown }[]
  antipatrones: { id: string; nombre: string; remediacion?: string; [key: string]: unknown }[]
  servicios: { id: string; nombre: string; descripcion?: string; capacidad?: string; proveedor?: string }[]
  motivos: { reglaId: string; motivo: string }[]
  revisiones: RevisionFormulario[]
}

export type FusionPendiente = {
  patrones: SugerenciasPreview['patrones']
  antipatrones: SugerenciasPreview['antipatrones']
  servicios: SugerenciasPreview['servicios']
}

export type FeedbackAplicarCatalogo = {
  patrones: number
  antipatrones: number
  servicios: number
  sinCambios: boolean
}

const PASO_NOMBRES = [
  'Proyecto y metas',
  'Restricciones y contexto',
  'Escenarios de calidad',
  'Estrategia y bloques',
  'Ejecución y despliegue',
  'Nube',
  'Patrones',
  'Well-Architected',
  'ADRs y riesgos',
] as const

const CAP_LABELS: Record<string, string> = {
  compute: 'Cómputo',
  integracion: 'Integración',
  datos: 'Datos',
  identidad: 'Identidad',
  red: 'Red',
  seguridad: 'Seguridad',
  observabilidad: 'Observabilidad',
}

function badgeNivel(nivel: RevisionFormulario['nivel']) {
  if (nivel === 'faltante') return 'badge-error'
  if (nivel === 'incompleto') return 'badge-warning'
  return 'badge-warning badge-outline'
}

function labelNivel(nivel: RevisionFormulario['nivel']) {
  if (nivel === 'faltante') return 'Faltante'
  if (nivel === 'incompleto') return 'Incompleto'
  return 'Contenido'
}

export function StepRevisionAlert({
  items,
  onOpenPanel,
}: {
  items: RevisionFormulario[]
  onOpenPanel?: () => void
}) {
  if (items.length === 0) return null

  return (
    <div className="alert alert-warning border-warning/40 bg-warning/15 text-base-content mb-4 text-sm" role="status">
      <ClipboardList className="size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Revisión de este paso ({items.length})</p>
        <ul className="mt-2 space-y-1 list-disc list-inside text-base-content/80">
          {items.slice(0, 4).map((r) => (
            <li key={r.id}>{r.mensaje}</li>
          ))}
        </ul>
        {items.length > 4 ? (
          <p className="text-xs text-base-content/60 mt-1">Y {items.length - 4} aviso(s) más en Sugerencias.</p>
        ) : null}
        {onOpenPanel ? (
          <button type="button" className="btn btn-ghost btn-xs mt-2 gap-1" onClick={onOpenPanel}>
            <Sparkles className="size-3" aria-hidden />
            Ver todas las sugerencias
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function SuggestionsPanel({
  open,
  onClose,
  sugerencias,
  proveedor,
  perfilActivo,
  fusionPendiente,
  feedbackAplicar,
  onApply,
  onGoStep,
}: {
  open: boolean
  onClose: () => void
  sugerencias: SugerenciasPreview
  proveedor: string
  perfilActivo: { label: string }[]
  fusionPendiente: FusionPendiente
  feedbackAplicar: FeedbackAplicarCatalogo | null
  onApply: () => void
  onGoStep: (step: number) => void
}) {
  if (!open) return null

  const revisiones = sugerencias.revisiones || []
  const revisionesPorPaso = PASO_NOMBRES.map((nombre, paso) => ({
    paso,
    nombre,
    items: revisiones.filter((r) => r.paso === paso),
  })).filter((g) => g.items.length > 0)

  const catalogoSugerido =
    sugerencias.patrones.length + sugerencias.antipatrones.length + sugerencias.servicios.length
  const catalogoPendiente =
    fusionPendiente.patrones.length + fusionPendiente.antipatrones.length + fusionPendiente.servicios.length
  const totalPanel = catalogoSugerido + revisiones.length
  const vacioCatalogo =
    sugerencias.patrones.length === 0 &&
    sugerencias.antipatrones.length === 0 &&
    sugerencias.servicios.length === 0 &&
    sugerencias.motivos.length === 0

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-neutral/40 backdrop-blur-[2px] no-print"
        aria-label="Cerrar panel de sugerencias"
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-base-300 bg-base-100 shadow-2xl no-print transition-transform"
        aria-labelledby="sugerencias-panel-title"
      >
        <header className="shrink-0 border-b border-base-200 bg-gradient-to-br from-primary/10 via-base-100 to-base-100 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary/90 flex items-center gap-1.5">
                <Sparkles className="size-3.5" aria-hidden />
                Asistente de diseño
              </p>
              <h2 id="sugerencias-panel-title" className="text-lg font-semibold mt-1">
                Sugerencias de arquitectura
              </h2>
              <p className="text-xs text-base-content/65 mt-1 leading-relaxed">
                Revisa formularios, perfil de negocio y catálogo para{' '}
                <ProviderBadge proveedor={proveedor} />.
              </p>
            </div>
            <button type="button" className="btn btn-sm btn-circle btn-ghost shrink-0" onClick={onClose} aria-label="Cerrar">
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-base-content/55 mb-2 flex items-center gap-2">
              <Lightbulb className="size-3.5 text-primary" aria-hidden />
              Cómo funciona
            </h3>
            <p className="text-sm text-base-content/75 leading-relaxed">
              En cada cambio del documento se analizan los <strong>formularios</strong> (completitud y calidad del
              texto) y las <strong>reglas del catálogo</strong> según el perfil de negocio. Puedes aplicar patrones y
              servicios al JSON sin perder decisiones ya marcadas como adoptadas o mitigadas.
            </p>
          </section>

          {revisionesPorPaso.length > 0 ? (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-base-content/55 mb-2 flex items-center gap-2">
                <ClipboardList className="size-3.5 text-primary" aria-hidden />
                Revisión del formulario ({revisiones.length})
              </h3>
              <div className="space-y-3">
                {revisionesPorPaso.map(({ paso, nombre, items }) => (
                  <article
                    key={paso}
                    className="rounded-xl border border-warning/35 bg-warning/10 overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-warning/25 bg-warning/20">
                      <p className="text-sm font-medium">
                        Paso {paso + 1}: {nombre}
                      </p>
                      <button type="button" className="btn btn-ghost btn-xs" onClick={() => onGoStep(paso)}>
                        Ir
                      </button>
                    </div>
                    <ul className="divide-y divide-warning/20">
                      {items.map((r) => (
                        <li key={r.id} className="px-3 py-2 text-sm leading-snug bg-warning/5">
                          <span className={`badge badge-xs mr-2 ${badgeNivel(r.nivel)}`}>{labelNivel(r.nivel)}</span>
                          {r.mensaje}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <div className="alert alert-success text-sm py-3">
              <Check className="size-5 shrink-0" aria-hidden />
              <span>Los pasos revisados no muestran avisos de completitud por ahora.</span>
            </div>
          )}

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-base-content/55 mb-2">Perfil activo</h3>
            {perfilActivo.length === 0 ? (
              <p className="text-sm text-base-content/55 border border-dashed border-base-300 rounded-lg p-3">
                Ningún rasgo marcado aún. Marca chips en «Restricciones y contexto» para activar reglas.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {perfilActivo.map(({ label }) => (
                  <span key={label} className="badge badge-sm badge-primary badge-outline">
                    {label}
                  </span>
                ))}
              </div>
            )}
            <button type="button" className="btn btn-ghost btn-xs mt-2" onClick={() => onGoStep(1)}>
              Ajustar perfil de negocio
            </button>
          </section>

          {sugerencias.motivos.length > 0 ? (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-base-content/55 mb-2">Reglas disparadas</h3>
              <ul className="space-y-2">
                {sugerencias.motivos.map((m) => (
                  <li key={m.reglaId} className="text-sm border border-base-200 rounded-lg px-3 py-2 bg-base-200/30">
                    <span className="badge badge-ghost badge-xs font-mono mr-2">{m.reglaId}</span>
                    {m.motivo}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {vacioCatalogo ? (
            <div className="alert alert-info text-sm">
              <Lightbulb className="size-5 shrink-0" />
              <span>Sin coincidencias con el catálogo actual. Prueba activar más rasgos o cambiar proveedor.</span>
            </div>
          ) : null}

          {catalogoPendiente > 0 ? (
            <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-primary mb-2">Se añadirá al documento</h3>
              <p className="text-sm text-base-content/75 mb-2">
                {fusionPendiente.patrones.length > 0
                  ? `${fusionPendiente.patrones.length} patrón(es)`
                  : null}
                {fusionPendiente.patrones.length > 0 && fusionPendiente.antipatrones.length > 0 ? ', ' : null}
                {fusionPendiente.antipatrones.length > 0
                  ? `${fusionPendiente.antipatrones.length} antipatrón(es)`
                  : null}
                {(fusionPendiente.patrones.length > 0 || fusionPendiente.antipatrones.length > 0) &&
                fusionPendiente.servicios.length > 0
                  ? ', '
                  : null}
                {fusionPendiente.servicios.length > 0
                  ? `${fusionPendiente.servicios.length} servicio(s) en la nube`
                  : null}
                .
              </p>
              <ul className="text-xs text-base-content/65 space-y-1 max-h-32 overflow-y-auto">
                {fusionPendiente.patrones.map((p) => (
                  <li key={p.id}>+ {p.nombre}</li>
                ))}
                {fusionPendiente.antipatrones.map((a) => (
                  <li key={a.id}>+ {a.nombre} (advertencia)</li>
                ))}
                {fusionPendiente.servicios.map((s) => (
                  <li key={s.id}>+ {s.nombre}</li>
                ))}
              </ul>
            </section>
          ) : catalogoSugerido > 0 ? (
            <div className="alert alert-success text-sm py-3">
              <Check className="size-5 shrink-0" aria-hidden />
              <span>Patrones, antipatrones y servicios del catálogo ya están en el documento.</span>
            </div>
          ) : null}

          {sugerencias.patrones.length > 0 ? (
            <section>
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-base-content/55 flex items-center gap-2">
                  <Puzzle className="size-3.5 text-primary" aria-hidden />
                  Patrones ({sugerencias.patrones.length})
                </h3>
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => onGoStep(6)}>
                  Ver paso
                </button>
              </div>
              <ul className="space-y-2">
                {sugerencias.patrones.map((p) => (
                  <li key={p.id} className="rounded-lg border border-base-300 p-3 bg-base-100">
                    <p className="font-medium text-sm">{p.nombre}</p>
                    {p.cuando ? <p className="text-xs text-base-content/60 mt-1">{p.cuando}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {sugerencias.antipatrones.length > 0 ? (
            <section>
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-base-content/55 flex items-center gap-2">
                  <AlertTriangle className="size-3.5 text-warning" aria-hidden />
                  Antipatrones ({sugerencias.antipatrones.length})
                </h3>
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => onGoStep(6)}>
                  Ver paso
                </button>
              </div>
              <ul className="space-y-2">
                {sugerencias.antipatrones.map((a) => (
                  <li key={a.id} className="rounded-lg border border-warning/30 p-3 bg-warning/5">
                    <p className="font-medium text-sm">{a.nombre}</p>
                    {a.remediacion ? <p className="text-xs text-base-content/65 mt-1">{a.remediacion}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {sugerencias.servicios.length > 0 ? (
            <section>
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-base-content/55 flex items-center gap-2">
                  <Cloud className="size-3.5 text-primary" aria-hidden />
                  Servicios ({sugerencias.servicios.length})
                </h3>
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => onGoStep(5)}>
                  Ver paso
                </button>
              </div>
              <ul className="space-y-2">
                {sugerencias.servicios.map((s) => (
                  <li key={s.id} className="rounded-lg border border-base-300 px-3 py-2">
                    <p className="font-medium text-sm">{s.nombre}</p>
                    <p className="text-xs text-base-content/55 mt-0.5">
                      {CAP_LABELS[s.capacidad || ''] || s.capacidad}
                      {s.proveedor ? ` · ${s.proveedor.toUpperCase()}` : ''}
                    </p>
                    {s.descripcion ? <p className="text-xs text-base-content/60 mt-1 line-clamp-2">{s.descripcion}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <footer className="shrink-0 border-t border-base-200 p-4 bg-base-100 flex flex-col gap-2">
          {feedbackAplicar?.sinCambios ? (
            <div className="alert alert-warning text-sm py-2 mb-1">
              <AlertTriangle className="size-4 shrink-0" aria-hidden />
              <span>
                No había elementos nuevos del catálogo (ya fusionados o sin reglas activas). Las{' '}
                <strong>revisiones del formulario</strong> se corrigen editando cada paso; este botón no las reduce.
              </span>
            </div>
          ) : null}
          <button
            type="button"
            className="btn btn-primary w-full gap-2"
            onClick={onApply}
            disabled={catalogoPendiente === 0}
            title={
              catalogoPendiente === 0
                ? 'No hay patrones, antipatrones ni servicios nuevos por fusionar'
                : undefined
            }
          >
            <Check className="size-4" aria-hidden />
            Aplicar catálogo al documento
          </button>
          <p className="text-[11px] text-center text-base-content/50 leading-snug">
            Solo fusiona patrones, advertencias y servicios ({catalogoPendiente} pendiente(s) de{' '}
            {catalogoSugerido} sugerido(s)). No reemplaza «adoptado» ni «mitigado». Las revisiones del formulario (
            {revisiones.length}) requieren editar cada paso ({totalPanel} ítems visibles en el panel).
          </p>
        </footer>
      </aside>
    </>
  )
}