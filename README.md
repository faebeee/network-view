# Network View

A toolbox for analysing the local network. It has a NestJS API (`apps/backend`) and a React UI (`apps/frontend`) in one Turborepo, using npm workspaces.

The first tool is **Network Discovery**. It lists every host on the network the machine is connected to, with IP, MAC address, vendor, hostname and latency.

## Getting started

Requirements: Node.js 22+ and npm 11+.

```bash
npm install
npm run dev        # contracts (watch) + API on http://127.0.0.1:3100 + UI on http://localhost:5180
```

Other tasks (all run through Turborepo):

| Command             | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run build`     | Builds contracts, backend and frontend        |
| `npm run test`      | Unit tests (Vitest) in every workspace        |
| `npm run typecheck` | TypeScript checks in every workspace          |
| `npm run lint`      | oxlint in every workspace                     |

Ports can be changed with `PORT` / `HOST` (backend) and `API_URL` (frontend dev proxy target).

> The API binds to `127.0.0.1` by default because it runs network scans and has no authentication. Only scan networks you are allowed to scan.

## Running in Podman

The app runs as three containers, started together with `podman compose` (`compose.yaml`):

```
browser -> host :PROXY_PORT (published)
              -> proxy :8080 ---+-- /api/* --> api  EDGE_GATEWAY:API_PORT   (host network)
                 [edge network] +-- /*     --> web  web:3200                [edge network]
```

| Container | Containerfile                | Network        | Role                                                                    |
| --------- | ---------------------------- | -------------- | ----------------------------------------------------------------------- |
| `proxy`   | `deploy/proxy/Containerfile` | `edge` bridge  | Caddy reverse proxy. The only container with a published port            |
| `web`     | `deploy/web/Containerfile`   | `edge` bridge  | Caddy serving the React build (SPA fallback, compression, asset caching) |
| `api`     | `deploy/api/Containerfile`   | host           | NestJS API with `ping` and `iproute2`, runs as the unprivileged `node` user |

```bash
cp .env.example .env          # optional: adjust the variables below
npm run container:up          # = podman compose up --build -d
# open http://localhost:8080 (or http://<host>:<PROXY_PORT>)
npm run container:logs
npm run container:down
```

| Variable       | Default         | Description                                                                 |
| -------------- | --------------- | --------------------------------------------------------------------------- |
| `PROXY_PORT`   | `8080`          | Host port the proxy is published on                                         |
| `PROXY_BIND`   | `0.0.0.0`       | Host address the port is published on (`127.0.0.1` = only this machine)    |
| `API_PORT`     | `3100`          | Port of the API on the edge gateway address                                 |
| `EDGE_SUBNET`  | `10.89.40.0/24` | Subnet of the bridge network shared by proxy and web                        |
| `EDGE_GATEWAY` | `10.89.40.1`    | Gateway of that network; the API listens here                               |

Why the API uses the host network: it needs the host's interfaces, ARP cache and default route to scan the LAN. It listens on the edge network's gateway address, which exists only on the host. The proxy can reach it there, the LAN cannot. The web container is not published either, so the proxy is the only way in.

All capabilities are dropped except `NET_RAW` (api, for ping) and `NET_BIND_SERVICE` (proxy and web, needed by the Caddy binary).

> **Rootful Podman required.** With rootless Podman the bridge network lives in a separate namespace, so the API cannot listen on its gateway. `podman machine` (macOS/Windows) is rootful by default; on Linux run `sudo podman compose up --build -d`.

> **macOS and Windows:** Podman runs containers inside a Linux VM. The app is reachable on `localhost:PROXY_PORT`, but "host network" is the VM's network (e.g. `192.168.127.0/24`), not your LAN, so scans only see the VM. To scan your LAN, run the containers on a Linux host or run the app without containers (`npm run dev`).

## Repository layout

```
apps/
  backend/                     NestJS 12 (ESM), Vitest
    src/
      main.ts                  bootstrap, /api prefix, validation pipe
      app.module.ts            imports FEATURE_MODULES
      features/
        index.ts               feature module registry
        network-discovery/     one Nest module per feature
          domain/              scan state + event stream
          probes/              ping, TCP, ARP table, gateway, hostname, vendor
      shared/                  code reused across features (IPv4/MAC math, process runner, concurrency)
  frontend/                    React 19, Vite, TanStack Router / Query / Table
    src/
      app/                     shell, router, query client, feature registry, dashboard
      routes/                  TanStack file routes; thin wrappers around feature pages
      features/
        network-discovery/
          api/                 fetch functions + TanStack Query options and mutations
          hooks/               live scan updates over server-sent events
          model/               pure logic (event reducer, IP sorting)
          components/          feature UI
          pages/               feature page
          feature.ts           metadata for navigation/dashboard
          index.ts             public API of the feature
      shared/                  UI kit, HTTP client, formatting helpers
packages/
  contracts/                   API types and zod schemas shared by backend and frontend
deploy/                        api/, web/, proxy/: Containerfile (+ Caddyfile) per container
compose.yaml                   Podman setup (host network, reverse proxy)
```

## How network discovery works

1. **Ping sweep**: every address in the subnet is pinged with the system `ping` binary (64 at a time). No root privileges required.
2. **TCP probe**: addresses that do not answer ping are probed on common ports (80, 443, 22, 445, …). An accepted *or refused* connection proves a host is there.
3. **ARP / neighbour cache**: the sweep makes the OS resolve every address, so the ARP cache afterwards also reveals hosts that ignore ping and TCP. This step adds the MAC addresses.
4. **Enrichment**: default gateway, MAC vendor (IEEE OUI registry), randomised "private" MAC detection, and hostnames via the system resolver (covers mDNS/Bonjour `.local` names) with a reverse-DNS fallback.

Results stream to the UI over server-sent events while the scan runs. Subnets larger than /22 are narrowed to the /24 around the local address unless a range is entered; ranges larger than /20 are rejected. Supported on macOS, Linux and Windows.

### API

| Method & path                                  | Description                                  |
| ---------------------------------------------- | -------------------------------------------- |
| `GET /api/network-discovery/interfaces`        | IPv4 interfaces that can be scanned          |
| `GET /api/network-discovery/scans`             | Recent scans (summaries)                     |
| `POST /api/network-discovery/scans`            | Start a scan `{ interfaceName?, cidr?, tcpProbe?, resolveHostnames? }` |
| `GET /api/network-discovery/scans/:id`         | Scan with all hosts                          |
| `DELETE /api/network-discovery/scans/:id`      | Cancel a running scan                        |
| `GET /api/network-discovery/scans/:id/events`  | SSE stream: snapshot, then host/progress/status events |

## Adding a feature

Example: a port scanner called `port-scanner`.

1. **Contracts**: add `packages/contracts/src/port-scanner.ts` (types + zod request schemas) and export it from `src/index.ts`.
2. **Backend**: create `apps/backend/src/features/port-scanner/` with a `PortScannerModule`, then add it to `FEATURE_MODULES` in `src/features/index.ts`. Put logic that other features could reuse in `src/shared/`.
3. **Frontend**: create `apps/frontend/src/features/port-scanner/` with the same structure (`api/`, `components/`, `pages/`, `feature.ts`, `index.ts`). Then:
   - add the route file `src/routes/port-scanner.tsx` that renders the feature page,
   - append the feature definition to `src/app/features.ts` so it appears in the sidebar and on the dashboard.

Features only import from `shared/`, from `@network-view/contracts`, and from other features' `index.ts`, never from their internals.
