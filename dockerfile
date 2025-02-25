FROM nginx:alpine

# Elimina configuraciones predeterminadas (opcional, pero recomendado)
RUN rm /etc/nginx/conf.d/default.conf

# Copia la configuración principal de Nginx
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

# Asegura que el directorio de caché de Nginx existe (opcional, pero útil)
RUN mkdir -p /var/cache/nginx && chmod 755 /var/cache/nginx

# Exponer el puerto 80
EXPOSE 80

# Ejecutar Nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]


