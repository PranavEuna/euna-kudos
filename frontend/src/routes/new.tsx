import { createFileRoute } from '@tanstack/react-router'
import { NewKudosPage } from '@/pages/NewKudosPage'

export const Route = createFileRoute('/new')({
  component: NewKudosPage,
})
