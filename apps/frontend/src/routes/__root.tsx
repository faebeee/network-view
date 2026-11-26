import { lazy, Suspense } from 'react'
import { createRootRouteWithContext, Link } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { AppShell } from '../app/shell/AppShell'

export interface RouterContext {
  queryClient: QueryClient
}

const Devtools = import.meta.env.DEV
  ? lazy(async () => {
      const [{ TanStackRouterDevtools }, { ReactQueryDevtools }] = await Promise.all([
        import('@tanstack/react-router-devtools'),
        import('@tanstack/react-query-devtools'),
      ])
      return {
        default: () => (
          <>
            <TanStackRouterDevtools position="bottom-right" />
            <ReactQueryDevtools buttonPosition="bottom-left" />
          </>
        ),
      }
    })
  : () => null

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <AppShell />
      <Suspense>
        <Devtools />
      </Suspense>
    </>
  ),
  notFoundComponent: () => (
    <div>
      <h1>Page not found</h1>
      <p>
        <Link to="/">Back to the dashboard</Link>
      </p>
    </div>
  ),
})
