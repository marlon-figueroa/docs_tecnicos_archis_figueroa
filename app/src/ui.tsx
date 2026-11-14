import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Cloud, Trash2 } from 'lucide-react'

const inputCls = 'input input-bordered w-full min-w-0 focus:input-primary text-base'
const textareaCls =
  'textarea textarea-bordered w-full min-h-28 min-w-0 leading-relaxed focus:textarea-primary text-base'
const selectCls = 'select select-bordered w-full min-w-0 focus:select-primary'

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props
  return <input className={[inputCls, className].filter(Boolean).join(' ')} {...rest} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props
  return <textarea className={[textareaCls, className].filter(Boolean).join(' ')} {...rest} />
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props
  return <select className={[selectCls, className].filter(Boolean).join(' ')} {...rest} />
}

/** Espaciado vertical uniforme entre campos de un paso */
export function FormStack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-5 w-full min-w-0">{children}</div>
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="form-control w-full min-w-0 gap-1.5">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-base-content">{label}</span>
        {hint ? <span className="text-xs text-base-content/55 leading-snug">{hint}</span> : null}
      </div>
      <div className="w-full min-w-0">{children}</div>
    </div>
  )
}

export function StepHeader({
  title,
  desc,
  icon: StepIcon,
  stepIndex,
  stepTotal,
}: {
  title: string
  desc: string
  icon?: LucideIcon
  stepIndex?: number
  stepTotal?: number
}) {
  const stepBadge =
    stepIndex !== undefined && stepTotal !== undefined ? (
      <span className="badge badge-sm badge-primary badge-outline font-mono tabular-nums">
        {String(stepIndex + 1).padStart(2, '0')}/{String(stepTotal).padStart(2, '0')}
      </span>
    ) : null

  return (
    <header className="relative mb-1 shrink-0 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.09] via-base-100 to-base-200/30 shadow-sm">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-primary via-primary/80 to-primary/40" aria-hidden />
      <div className="absolute -right-8 -top-10 size-40 rounded-full bg-primary/[0.06] blur-2xl pointer-events-none" aria-hidden />

      <div className="relative flex flex-col gap-4 p-5 md:p-6 pl-6 md:pl-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {stepIndex !== undefined && stepTotal !== undefined ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary/90">
              Paso {stepIndex + 1} de {stepTotal}
            </p>
          ) : (
            <span />
          )}
          {stepBadge}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start gap-4 min-w-0">
          {StepIcon ? (
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-content shadow-lg shadow-primary/25 ring-4 ring-primary/10"
              aria-hidden
            >
              <StepIcon className="size-7" strokeWidth={1.75} />
            </div>
          ) : null}
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-xl md:text-2xl font-semibold text-base-content tracking-tight leading-tight">{title}</h2>
            <p className="text-sm md:text-[0.9375rem] text-base-content/70 mt-2.5 leading-relaxed max-w-4xl">{desc}</p>
          </div>
        </div>
      </div>
    </header>
  )
}

export function StackPanel({
  title,
  badge,
  onRemove,
  children,
}: {
  title: string
  badge?: string
  onRemove?: () => void
  children: ReactNode
}) {
  return (
    <div className="card card-border bg-base-200/30 shadow-sm w-full min-w-0">
      <div className="card-body gap-0 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-primary/15">
          <h3 className="font-semibold text-base text-base-content flex items-center gap-2 min-w-0">
            <span className="size-1.5 rounded-full bg-primary shrink-0" aria-hidden />
            <span className="truncate">{title}</span>
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            {badge ? <span className="badge badge-primary badge-outline badge-sm font-mono">{badge}</span> : null}
            {onRemove ? (
              <button
                type="button"
                className="btn btn-ghost btn-xs text-error gap-1"
                onClick={onRemove}
                aria-label={`Eliminar ${title}`}
              >
                <Trash2 className="size-3.5" aria-hidden />
                Eliminar
              </button>
            ) : null}
          </div>
        </div>
        <FormStack>{children}</FormStack>
      </div>
    </div>
  )
}

export function FormRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={[
        'grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0',
        '[&>*]:min-w-0',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}

export function ChoiceChip({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 p-3.5 h-full min-h-[3.25rem] rounded-xl border border-base-300 bg-base-100 hover:border-primary/30 cursor-pointer transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
      <input
        type="checkbox"
        className="toggle toggle-primary shrink-0"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm leading-snug text-base-content/90 min-w-0">{label}</span>
    </label>
  )
}

export function ServiceTile({
  nombre,
  descripcion,
  selected,
  disabled,
  onToggle,
}: {
  nombre: string
  descripcion: string
  selected: boolean
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <label
      className={[
        'flex gap-3 items-center p-4 h-full min-w-0 rounded-xl border cursor-pointer transition-all',
        selected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-base-300 bg-base-100 hover:border-base-content/20',
        disabled ? 'opacity-40 pointer-events-none' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        type="checkbox"
        className="toggle toggle-primary shrink-0"
        checked={selected}
        disabled={disabled}
        onChange={onToggle}
      />
      <span className="min-w-0 flex-1">
        <span className="font-medium text-sm block leading-tight break-words">{nombre}</span>
        <span className="text-xs text-base-content/60 mt-1 block leading-relaxed break-words">{descripcion}</span>
      </span>
    </label>
  )
}

export function ProviderBadge({ proveedor }: { proveedor: string }) {
  const cls =
    proveedor === 'aws' ? 'badge-warning' : proveedor === 'azure' ? 'badge-info' : 'badge-secondary'
  return (
    <span className={`badge badge-sm gap-1 ${cls} uppercase font-semibold`}>
      <Cloud className="size-3" aria-hidden />
      {proveedor}
    </span>
  )
}

export function SectionTitle({ children, compact }: { children: ReactNode; compact?: boolean }) {
  return (
    <h3
      className={[
        'font-semibold text-sm uppercase tracking-wide text-base-content/55 mb-3',
        compact ? 'mt-4' : 'mt-6',
      ].join(' ')}
    >
      {children}
    </h3>
  )
}

export function PatternRow({
  nombre,
  value,
  options,
  onChange,
}: {
  nombre: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 sm:gap-4 items-center p-4 border border-base-300 rounded-xl bg-base-100">
      <span className="text-sm font-medium min-w-0 break-words">{nombre}</span>
      <SelectInput className="select-sm w-full sm:w-44 justify-self-stretch sm:justify-self-end" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </SelectInput>
    </div>
  )
}