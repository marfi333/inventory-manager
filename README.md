# Inventory Manager

Personal inventory tracking app. Hono API + Vue 3 frontend, deployed as Docker containers via Dokploy.

## Stack

- **API:** Hono, SQLite, Zod
- **UI:** Vue 3, PrimeVue (Aura), Tailwind CSS
- **Infra:** Docker, nginx, Watchtower, Dokploy

PWA with offline support — cached reads via Dexie/IndexedDB, queued writes replayed on reconnect.

## Dev

```bash
pnpm install
pnpm dev:api   # http://localhost:3001
pnpm dev:ui    # http://localhost:5173
```

## Build & Deploy

```bash
# Local Docker
docker compose -f docker/docker-compose.yml up --build
# → http://localhost:8080

# Production (Dokploy)
# Uses docker-compose.prod.yml pulling from GHCR
# Images built on push to main via .github/workflows/docker-publish.yml
```

Images: `ghcr.io/marfi333/inventory-manager/api:latest`, `ghcr.io/marfi333/inventory-manager/ui:latest`

Watchtower auto-pulls new `:latest` images every 120s. SQLite data persists in the `api_data` volume.

HTTPS required for PWA (service worker, install prompt). Dokploy/Traefik terminates TLS.

## API

| Method | Path | |
|--------|------|---|
| GET/POST | `/api/categories` | list / create |
| GET/PUT/DELETE | `/api/categories/:id` | read / update / delete |
| GET/POST | `/api/items` | list / create |
| GET/PUT/DELETE | `/api/items/:id` | read / update / delete |
| GET | `/api/items/category/:categoryId` | by category |
| PATCH | `/api/items/:id/quantity` | adjust quantity |
