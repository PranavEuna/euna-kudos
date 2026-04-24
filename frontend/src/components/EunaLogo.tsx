import { cn } from '@/lib/utils'

export function EunaLogo({
  className,
  showWordmark = true,
}: {
  className?: string
  showWordmark?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className="relative grid h-8 w-8 place-items-center rounded-lg font-bold text-white shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #6145f7 0%, #281978 100%)',
        }}
        aria-hidden
      >
        <span className="text-[13px] leading-none">e</span>
        <span
          className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full"
          style={{ background: '#e7690d' }}
        />
      </span>
      {showWordmark && (
        <span className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-bold tracking-tight">Euna</span>
          <span className="text-[15px] font-medium text-muted-foreground">Kudos</span>
        </span>
      )}
    </span>
  )
}
