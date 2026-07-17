FROM node:20-alpine AS node-builder
WORKDIR /src
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration=development
FROM nginx:alpine

ENV BACKEND_URL=http://host.docker.internal:8080
ENV KEYCLOAK_URL=http://host.docker.internal:8180

COPY --from=node-builder /src/dist/temporeale-fe /usr/share/nginx/html
COPY nginx.site.template /etc/nginx/templates/default.conf.template

CMD ["nginx", "-g", "daemon off;"]