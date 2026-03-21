FROM docker:28-cli AS dockercli

FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --filter @judge/worker... --frozen-lockfile

FROM deps AS build
WORKDIR /app
COPY apps/worker apps/worker
COPY packages/shared packages/shared
COPY packages/config packages/config
RUN pnpm --filter @judge/shared build && pnpm --filter @judge/worker build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dockercli /usr/local/bin/docker /usr/local/bin/docker
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY docker/judge-runner ./docker/judge-runner
COPY docker/worker/start.sh ./docker/worker/start.sh
RUN chmod +x ./docker/worker/start.sh
WORKDIR /app/apps/worker
CMD ["/app/docker/worker/start.sh"]
