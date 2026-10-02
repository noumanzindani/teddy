FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma
EXPOSE 4000
# Cap the V8 heap so a small container (512MB) GCs aggressively instead of growing
# until the OS OOM-kills the process. Overridable via NODE_OPTIONS env if needed.
CMD ["sh", "-c", "npx prisma migrate deploy && NODE_OPTIONS=\"--max-old-space-size=384 ${NODE_OPTIONS}\" node dist/server.js"]
