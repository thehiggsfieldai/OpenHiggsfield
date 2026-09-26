FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY apps/story-studio/package*.json ./apps/story-studio/
RUN npm ci --prefix apps/story-studio
COPY apps ./apps
RUN npm run build
FROM node:24-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 DATA_DIR=/data STORY_ASSETS=/app/apps/story-studio/dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/story-studio/dist ./apps/story-studio/dist
COPY --chown=node:node apps/story-studio/public ./apps/story-studio/public
COPY --chown=node:node deploy ./deploy
COPY --chown=node:node lib ./lib
COPY package.json ./
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["node","deploy/studio/server.mjs"]
