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
RUN npm run build:indexing

# ---- Release ----
FROM base AS release
# Copy necessary node modules from previous stages
COPY --from=dependencies /app/node_modules ./node_modules
# Copy necessary files from build stage
COPY --from=build /app/dist/apps/indexing/main.js ./dist/apps/indexing/main.js
# Copy the 'shared/abi' directory
COPY shared/abi ./shared/abi
CMD ["node", "dist/apps/indexing/main.js"]
