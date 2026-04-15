FROM node:22-alpine AS builder

WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

ARG APP_FILTER

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @bugsense/types build
RUN pnpm --filter @bugsense/config build
RUN pnpm --filter ${APP_FILTER} build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

COPY --from=builder /app /app

ARG APP_PATH

WORKDIR /app/${APP_PATH}

CMD ["pnpm", "start"]
