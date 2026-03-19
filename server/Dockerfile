FROM node:13 as dependencies

# Create app directory
WORKDIR /app

# Install app dependencies
COPY ./package*.json ./
RUN npm ci


## --

FROM node:13 as server

# Create app directory
WORKDIR /app

COPY ./package*.json ./
COPY --from=dependencies /app/node_modules .

# Copy src
COPY . .

EXPOSE 4000
CMD [ "node", "index.js" ]
