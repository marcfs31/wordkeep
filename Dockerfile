FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001
ENV WORDKEEP_DB=/data/wordkeep.db
ENV CLIENT_DIST=/app/client/dist

EXPOSE 3001
CMD ["npm", "run", "start", "-w", "server"]
