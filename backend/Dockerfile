# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

# No prisma db push needed — Mongoose creates collections automatically
CMD ["node", "src/server.js"]
