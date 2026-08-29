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
# Public (browser-visible) configuration is inlined by `next build`, so it must be present at build
# time. Values come from compose build args (see compose.prod.yaml `x-build-args`). No secrets here.
ARG WEB_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MEDIA_URL
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_COOKIEBOT_ID
ARG NEXT_PUBLIC_LEGAL_NAME
ARG NEXT_PUBLIC_CONTACT_EMAIL
ARG NEXT_PUBLIC_PRIVACY_EMAIL
ARG NEXT_PUBLIC_CITY
ARG NEXT_PUBLIC_SOCIAL_INSTAGRAM
ARG NEXT_PUBLIC_SOCIAL_PINTEREST
ARG NEXT_PUBLIC_SOCIAL_YOUTUBE
ARG NEXT_PUBLIC_SOCIAL_X
ARG NEXT_PUBLIC_SOCIAL_LINKEDIN
ENV WEB_URL=$WEB_URL \
  NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
  NEXT_PUBLIC_MEDIA_URL=$NEXT_PUBLIC_MEDIA_URL \
  NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID \
  NEXT_PUBLIC_COOKIEBOT_ID=$NEXT_PUBLIC_COOKIEBOT_ID \
  NEXT_PUBLIC_LEGAL_NAME=$NEXT_PUBLIC_LEGAL_NAME \
  NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL \
  NEXT_PUBLIC_PRIVACY_EMAIL=$NEXT_PUBLIC_PRIVACY_EMAIL \
  NEXT_PUBLIC_CITY=$NEXT_PUBLIC_CITY \
  NEXT_PUBLIC_SOCIAL_INSTAGRAM=$NEXT_PUBLIC_SOCIAL_INSTAGRAM \
  NEXT_PUBLIC_SOCIAL_PINTEREST=$NEXT_PUBLIC_SOCIAL_PINTEREST \
  NEXT_PUBLIC_SOCIAL_YOUTUBE=$NEXT_PUBLIC_SOCIAL_YOUTUBE \
  NEXT_PUBLIC_SOCIAL_X=$NEXT_PUBLIC_SOCIAL_X \
  NEXT_PUBLIC_SOCIAL_LINKEDIN=$NEXT_PUBLIC_SOCIAL_LINKEDIN \
  NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /workspace /workspace
ARG APP
ENV APP_NAME=$APP
CMD ["sh", "-c", "pnpm --filter @ilham/$APP_NAME start"]
