FROM node:20-alpine AS base
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
COPY package.json ./

RUN npm ci --omit=dev

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
