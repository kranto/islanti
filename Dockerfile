FROM node:13 as client-app

# Create app directory
WORKDIR /app/client

# Install app dependencies
COPY ./client/package*.json ./
RUN npm ci

# Bundle app source
COPY ./client/public ./public
COPY ./client/src ./src
RUN npm run build

## --

FROM node:13 as server-dependencies

# Create app directory
WORKDIR /app

# Install app dependencies
COPY ./server/package*.json ./
RUN npm ci

## --

FROM node:13 as server-app

# Create app directory
WORKDIR /app

COPY ./server/package*.json ./
COPY --from=server-dependencies /app/node_modules ./node_modules/

# Copy src
COPY ./server/*.js ./

# Copy client-app
COPY --from=client-app /app/client/build/ /app/client/

EXPOSE 4000
CMD [ "node", "index.js" ]
