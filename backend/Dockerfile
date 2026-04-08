# Stage 1: Build
FROM rust:1.83-slim AS builder
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Cache dependencies — copy Cargo files first
COPY Cargo.toml ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release 2>/dev/null || true
RUN rm -rf src

# Build application
COPY src/ src/
COPY migrations/ migrations/
RUN touch src/main.rs && cargo build --release

# Stage 2: Runtime
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates openssl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/magnetbrains-api /usr/local/bin/
COPY migrations/ /app/migrations/

WORKDIR /app

# Generate JWT keys at build time (for platforms without persistent disk)
RUN mkdir -p keys && \
    openssl genpkey -algorithm RSA -out keys/private.pem -pkeyopt rsa_keygen_bits:2048 && \
    openssl rsa -pubout -in keys/private.pem -out keys/public.pem

EXPOSE 8080

CMD ["magnetbrains-api"]
