# ---- Base Node ----
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

# ---- Dependencies ----
FROM base AS dependencies
# Install both production and development dependencies.
RUN npm install && npm cache clean --force

# ---- Copy Files/Build ----
FROM dependencies AS build
COPY . .
RUN npm run build:api

# --- Release ----
FROM base AS release
# Install production dependencies.
COPY --from=dependencies /app/package*.json ./
RUN npm install --production && npm cache clean --force

# Copy built api
COPY --from=build /app/dist/apps/api/main.js ./dist/apps/api/main.js
EXPOSE 3001

ARG LUKSO_DATA_CONNECTION_STRING
ARG LUKSO_STRUCTURE_CONNECTION_STRING

ENV LUKSO_DATA_CONNECTION_STRING=${LUKSO_DATA_CONNECTION_STRING}
ENV LUKSO_STRUCTURE_CONNECTION_STRING=${LUKSO_STRUCTURE_CONNECTION_STRING}

CMD ["node", "dist/apps/api/main.js"]
