import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  BadgeCheck,
  Blocks,
  Braces,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDollarSign,
  Cloud,
  Download,
  FileDown,
  FileText,
  FileUp,
  Gauge,
  Landmark,
  Layers,
  Loader2,
  Menu,
  Network,
  Plus,
  Puzzle,
  Rocket,
  RotateCcw,
  Shield,
  Sparkles,
  Target,
  TriangleAlert,
} from 'lucide-react'

const sizeMap = { sm: 'size-3.5', md: 'size-4', lg: 'size-5', xl: 'size-6' } as const

type IconSize = keyof typeof sizeMap

export function Icon({
  icon: I,
  size = 'md',
  className,
}: {
  icon: LucideIcon
  size?: IconSize
  className?: string
}) {
  return <I className={[sizeMap[size], 'shrink-0', className].filter(Boolean).join(' ')} aria-hidden />
}

/** Iconos del menú lateral (índice = paso del wizard). */
export const STEP_ICONS: LucideIcon[] = [
  Target,
  Shield,
  Gauge,
  Blocks,
  Rocket,
  Cloud,
  Puzzle,
  Landmark,
  TriangleAlert,
  Network,
  BadgeCheck,
]

export {
  AlertTriangle,
  Braces,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDollarSign,
  Cloud,
  Download,
  FileDown,
  FileText,
  FileUp,
  Layers,
  Loader2,
  Menu,
  Plus,
  RotateCcw,
  Sparkles,
}

type AddButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  size?: 'sm' | 'md'
}

export function AddButton({ children, className, size = 'sm', ...rest }: AddButtonProps) {
  return (
    <button
      type="button"
      className={['btn btn-outline gap-2', size === 'sm' ? 'btn-sm' : '', className].filter(Boolean).join(' ')}
      {...rest}
    >
      <Plus className="size-4 shrink-0" aria-hidden />
      {children}
    </button>
  )
}