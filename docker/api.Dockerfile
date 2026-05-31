FROM node:20-slim AS builder

RUN corepack enable && corepack prepare pnpm@10.12.0 --activate

WORKDIR /build
COPY . /build

RUN pnpm install --frozen-lockfile && \
    pnpm run build:api && \
    pnpm --filter api deploy --prod /prod/api

FROM node:20-slim AS api

WORKDIR /app/api

COPY --from=builder /prod/api/node_modules /app/api/node_modules
COPY --from=builder /prod/api/package.json /app/api/package.json
COPY --from=builder /build/api/dist /app/api/dist

EXPOSE 3001

CMD ["node", "dist/index.js"]
