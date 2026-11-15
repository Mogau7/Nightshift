FROM node:20-slim AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM rust:1.92-slim-bookworm AS backend-builder
WORKDIR /backend
COPY backend/Cargo.toml backend/Cargo.lock* ./
COPY backend/src ./src
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=backend-builder /backend/target/release/nightshift-backend /usr/local/bin/nightshift-backend
COPY --from=frontend-builder /frontend/dist ./static
EXPOSE 3001
CMD ["nightshift-backend"]
