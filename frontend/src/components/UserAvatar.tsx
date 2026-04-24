import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { avatarGradient, getInitials } from '@/lib/format'

type Size = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm',
  xl: 'h-16 w-16 text-lg',
}

export function UserAvatar({
  name,
  email,
  size = 'md',
  className,
}: {
  name?: string | null
  email: string
  size?: Size
  className?: string
}) {
  const initials = getInitials(name ?? null, email)
  return (
    <Avatar className={cn(SIZE_CLASSES[size], 'ring-1 ring-black/5 dark:ring-white/10', className)}>
      <AvatarFallback
        style={{ background: avatarGradient(email) }}
        className="tracking-wide"
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
