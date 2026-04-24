import { cn } from '@/lib/utils'
import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  CATEGORY_STYLE,
  type KudosCategory,
} from '@/lib/kudos'

export function CategoryChip({
  category,
  active = false,
  compact = false,
  count,
  className,
  ...props
}: {
  category: KudosCategory
  active?: boolean
  compact?: boolean
  count?: number
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const style = CATEGORY_STYLE[category]
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        compact && 'px-2 py-0.5 text-[11px]',
        active ? style.chipActive : style.chip,
        className
      )}
      {...props}
    >
      <span aria-hidden>{CATEGORY_EMOJI[category]}</span>
      <span>{CATEGORY_LABEL[category]}</span>
      {typeof count === 'number' && (
        <span
          className={cn(
            'ml-1 rounded-full px-1.5 text-[10px] font-semibold',
            active ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10'
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

export function CategoryBadge({
  category,
  className,
}: {
  category: KudosCategory
  className?: string
}) {
  const style = CATEGORY_STYLE[category]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
        style.chip,
        className
      )}
    >
      <span aria-hidden>{CATEGORY_EMOJI[category]}</span>
      <span>{CATEGORY_LABEL[category]}</span>
    </span>
  )
}
