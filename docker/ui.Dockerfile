FROM node:20-slim AS builder

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN corepack enable && corepack prepare pnpm@10.12.0 --activate

WORKDIR /build

COPY . .

RUN pnpm install --frozen-lockfile && \
    pnpm run build:ui

FROM nginx:alpine

COPY --from=builder /build/ui/dist /usr/share/nginx/html

COPY docker/nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
