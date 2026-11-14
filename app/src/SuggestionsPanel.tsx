import {
  AlertTriangle,
  Check,
  Cloud,
  Lightbulb,
  Puzzle,
  Sparkles,
  X,
} from 'lucide-react'
import { ProviderBadge } from './ui'

export type SugerenciasPreview = {
  patrones: { id: string; nombre: string; cuando?: string; [key: string]: unknown }[]
  antipatrones: { id: string; nombre: string; remediacion?: string; [key: string]: unknown }[]
  servicios: { id: string; nombre: string; descripcion?: string; capacidad?: string; proveedor?: string }[]
  motivos: { reglaId: string; motivo: string }[]
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

export function SuggestionsPanel({
  open,
  onClose,
  sugerencias,
  proveedor,
  perfilActivo,
  onApply,
  onGoStep,
}: {
  open: boolean
  onClose: () => void
  sugerencias: SugerenciasPreview
  proveedor: string
  perfilActivo: { label: string }[]
  onApply: () => void
  onGoStep: (step: number) => void
}) {
  if (!open) return null

  const total =
    sugerencias.patrones.length + sugerencias.antipatrones.length + sugerencias.servicios.length
  const vacio = total === 0 && sugerencias.motivos.length === 0

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
                Motor de reglas
              </p>
              <h2 id="sugerencias-panel-title" className="text-lg font-semibold mt-1">
                Sugerencias de arquitectura
              </h2>
              <p className="text-xs text-base-content/65 mt-1 leading-relaxed">
                Recomendaciones según el perfil de negocio y el proveedor{' '}
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
              Las reglas del catálogo comparan tu <strong>perfil de negocio</strong> (paso 2) con patrones,
              antipatrones y servicios de nube. Puedes revisar la propuesta aquí y aplicarla al JSON sin perder
              decisiones ya marcadas como adoptadas.
            </p>
            <button type="button" className="btn btn-ghost btn-xs mt-2" onClick={() => onGoStep(1)}>
              Ajustar perfil de negocio
            </button>
          </section>

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

          {vacio ? (
            <div className="alert alert-info text-sm">
              <Lightbulb className="size-5 shrink-0" />
              <span>Sin coincidencias con el catálogo actual. Prueba activar más rasgos o cambiar proveedor.</span>
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
          <button type="button" className="btn btn-primary w-full gap-2" onClick={onApply}>
            <Check className="size-4" aria-hidden />
            Aplicar sugerencias al documento
          </button>
          <p className="text-[11px] text-center text-base-content/50 leading-snug">
            Añade patrones, advertencias y servicios compatibles con {proveedor.toUpperCase()}. No reemplaza estados
            «adoptado» ni «mitigado».
          </p>
        </footer>
      </aside>
    </>
  )
}