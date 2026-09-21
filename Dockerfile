# Front-end build, with the toolchain better-sqlite3 needs when no prebuilt binary matches
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# Runtime: the API server, which also serves the built front-end
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
EXPOSE 3000
CMD ["node", "server/index.js"]
