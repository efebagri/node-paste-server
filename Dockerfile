#stage 1
FROM node:18-slim as node
EXPOSE 5000
WORKDIR /app
COPY . .
RUN yarn install
CMD ["node", "index.js"]