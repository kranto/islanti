FROM node:13 as client-app

# Create app directory
WORKDIR /app/client

# Install app dependencies
COPY ./package*.json ./
RUN npm ci

# Bundle app source
COPY . .
RUN npm run build