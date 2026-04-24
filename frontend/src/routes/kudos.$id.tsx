import { createFileRoute } from '@tanstack/react-router'
import { KudosDetailPage } from '@/pages/KudosDetailPage'

export const Route = createFileRoute('/kudos/$id')({
  component: KudosDetailPage,
})
