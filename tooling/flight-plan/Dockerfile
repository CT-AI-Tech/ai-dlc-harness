FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
ENV NODE_ENV=production PORT=8080 PLAN_STORE_DIR=/data/plans CUSTOMER_STORE_DIR=/data/customers
RUN mkdir -p /data/plans /data/customers && chown -R node:node /data
VOLUME ["/data"]
EXPOSE 8080
USER node
CMD ["node", "server/index.js"]
