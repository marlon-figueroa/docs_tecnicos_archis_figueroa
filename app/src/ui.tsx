import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

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

export function StepHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <header className="mb-1 pb-4 border-b border-base-200 shrink-0">
      <h2 className="text-xl font-semibold text-base-content">{title}</h2>
      <p className="text-sm text-base-content/65 mt-1.5 leading-relaxed">{desc}</p>
    </header>
  )
}

export function StackPanel({
  title,
  badge,
  children,
}: {
  title: string
  badge?: string
  children: ReactNode
}) {
  return (
    <div className="card card-border bg-base-200/30 shadow-sm w-full min-w-0">
      <div className="card-body gap-0 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-base-300/60">
          <h3 className="font-semibold text-base">{title}</h3>
          {badge ? <span className="badge badge-ghost badge-sm font-mono shrink-0">{badge}</span> : null}
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
    <label className="flex items-start gap-3 p-3.5 h-full min-h-[3.25rem] rounded-xl border border-base-300 bg-base-100 hover:border-primary/30 cursor-pointer transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
      <input
        type="checkbox"
        className="checkbox checkbox-sm checkbox-primary mt-0.5 shrink-0"
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
        'flex gap-3 items-start p-4 h-full min-w-0 rounded-xl border cursor-pointer transition-all',
        selected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-base-300 bg-base-100 hover:border-base-content/20',
        disabled ? 'opacity-40 pointer-events-none' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        type="checkbox"
        className="checkbox checkbox-primary checkbox-sm mt-1 shrink-0"
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
  return <span className={`badge badge-sm ${cls} uppercase font-semibold`}>{proveedor}</span>
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