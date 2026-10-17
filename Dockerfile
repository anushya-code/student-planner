FROM node:20-slim
WORKDIR /app

# build tools (only used if a prebuilt sqlite binary is not available)
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY . .
RUN mkdir -p /app/data

ENV PORT=8080
ENV DB_PATH=/app/data/study.db
EXPOSE 8080

CMD ["node", "server.js"]