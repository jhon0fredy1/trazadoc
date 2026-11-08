FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node . .
RUN mkdir -p /data && chown node:node /data
USER node
ENV DATA_DIR=/data
CMD ["node", "services/gateway.js"]
