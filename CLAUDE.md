# Network View

Turborepo (npm workspaces) with a NestJS API in `apps/backend`, a React UI in `apps/frontend` and shared API contracts in `packages/contracts`. See README.md for layout, commands and the "Adding a feature" checklist.

- Feature-driven architecture: each tool is a folder under `src/features/<name>` in both apps. Features import only from `shared/`, `@network-view/contracts` and other features' `index.ts`.
- API types and request schemas live in `packages/contracts` (zod). Change them there first; the backend validates request bodies with `@Body({ schema })`.
- Backend specifics (ESM, `.js` import suffixes, Vitest) are in `apps/backend/AGENTS.md`.
- Frontend: TanStack Router file routes in `src/routes` (the generated `src/routeTree.gen.ts` is committed, do not edit it), TanStack Query for server state, TanStack Table v9 (`useTable` + `tableFeatures`, not the v8 API).
- Dev ports: API 3100, UI 5180 (5173/3000 are used by other local projects).
- Containers: `compose.yaml` + `deploy/{api,web,proxy}`. proxy and web share the `edge` bridge network and only the proxy publishes a port (`PROXY_PORT`); api uses the host network and listens on the edge gateway IP. Needs rootful Podman. Images are built with `turbo prune`, so a new workspace dependency needs no Containerfile change.
- Verify with `npm run typecheck && npm run test && npm run lint`.
