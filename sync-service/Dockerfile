FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

# Create logs dir
RUN mkdir -p /app/logs

EXPOSE 4000
CMD ["node", "src/server.js"]
