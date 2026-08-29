FROM node:22-bookworm-slim AS base
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
WORKDIR /workspace

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json eslint.config.mjs ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile && pnpm db:generate

FROM dependencies AS build
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /workspace /workspace
ARG APP
ENV APP_NAME=$APP
CMD ["sh", "-c", "pnpm --filter @ilham/$APP_NAME start"]
