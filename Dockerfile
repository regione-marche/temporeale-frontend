# Richiede dist/temporeale-fe già buildata (es. npm run build -- --configuration production).
# La cartella dist deve esistere prima di docker compose build (non è più in .dockerignore).

FROM nginx:alpine

ENV BACKEND_URL=http://host.docker.internal:8080
ENV KEYCLOAK_URL=http://host.docker.internal:8180

COPY dist/temporeale-fe /usr/share/nginx/html
COPY nginx.site.template /etc/nginx/templates/default.conf.template

CMD ["nginx", "-g", "daemon off;"]


/etc/nginx/templates/default.conf.template