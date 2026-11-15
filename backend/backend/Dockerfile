FROM rust:slim-bookworm AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/nightshift-backend /usr/local/bin/nightshift-backend
EXPOSE 3001
CMD ["nightshift-backend"]
