import { Toaster as Sonner } from 'sonner'
import { useTheme } from '@/lib/theme'

export function Toaster() {
  const { resolvedTheme } = useTheme()
  return (
    <Sonner
      theme={resolvedTheme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group toast !bg-card !text-card-foreground !border !border-border !shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
        },
      }}
    />
  )
}
