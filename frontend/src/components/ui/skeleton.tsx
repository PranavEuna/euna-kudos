import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('euna-skeleton rounded-md bg-muted', className)}
      {...props}
    />
  )
}
