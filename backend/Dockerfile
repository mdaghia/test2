FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
RUN apk add --no-cache dumb-init
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN mkdir -p uploads output
EXPOSE 5000
USER node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
