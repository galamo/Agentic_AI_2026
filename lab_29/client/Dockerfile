# Multi-stage build: stage 1 compiles the app with Node; stage 2 serves static files with nginx only
# (two FROM lines = two images chained; the final image has no Node/npm—smaller and safer for production)

# ---- Stage 1: build ----
# Use Node 20 on Alpine Linux; name this stage "builder" so we can COPY --from=builder later
FROM node:20-alpine AS builder
# All following commands run in /app inside the container
WORKDIR /app
# Copy only package.json first so the npm install layer stays cached until dependencies change
COPY package.json .
# Install JavaScript dependencies listed in package.json
RUN npm install
# Copy the rest of the source (HTML, JS, configs, etc.)
COPY . .
# Produce production static assets (e.g. Vite → dist/)
RUN npm run build

# ---- Stage 2: serve ----
# Fresh image: nginx only. Previous stage’s filesystem is discarded except what we explicitly copy in
FROM nginx:alpine
# Pull built site from the builder stage into nginx’s default document root
COPY --from=builder /app/dist /usr/share/nginx/html
# Replace default vhost with our config (e.g. SPA fallback, gzip)
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Document that the process listens on 80 (publish with docker run -p or compose)
EXPOSE 80
