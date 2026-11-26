import { createFileRoute } from '@tanstack/react-router'
import { Dashboard } from '../app/Dashboard'

export const Route = createFileRoute('/')({
  component: Dashboard,
})
