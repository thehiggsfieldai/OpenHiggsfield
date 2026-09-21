FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY app ./app
COPY public ./public
COPY lib ./lib
COPY scripts ./scripts
COPY deploy ./deploy
RUN npm run build && npm prune --omit=dev --ignore-scripts
FROM node:24-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data HOST=0.0.0.0
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/deploy ./deploy
COPY --from=build --chown=node:node /app/lib ./lib
COPY --from=build --chown=node:node /app/scripts/vault-maintenance.mjs ./scripts/vault-maintenance.mjs
COPY --from=build --chown=node:node /app/scripts/account-status.mjs ./scripts/account-status.mjs
COPY --from=build --chown=node:node /app/scripts/release-check.mjs ./scripts/release-check.mjs
COPY --from=build --chown=node:node /app/.sites-runtime/studio-release/site ./.sites-runtime/studio-release/site
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["node","deploy/studio/server.mjs"]
