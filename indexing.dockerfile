# ---- Base Node ----
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

# ---- Dependencies ----
FROM base AS dependencies
# Install both production and development dependencies.
RUN apk add --no-cache bash  # Add this line to install bash
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
COPY wait-for-it.sh ./wait-for-it.sh
# Add this line to install bash in the release stage
RUN apk add --no-cache bash
RUN chmod +x ./wait-for-it.sh

ARG LUKSO_DATA_CONNECTION_STRING
ARG LUKSO_STRUCTURE_CONNECTION_STRING
ARG RPC_URL

ENV LUKSO_DATA_CONNECTION_STRING=${LUKSO_DATA_CONNECTION_STRING}
ENV LUKSO_STRUCTURE_CONNECTION_STRING=${LUKSO_STRUCTURE_CONNECTION_STRING}
ENV RPC_URL=${RPC_URL}

CMD ["./wait-for-it.sh", "lukso-db:5432", "--", "node", "dist/apps/indexing/main.js"]
