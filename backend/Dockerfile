# Single-stage build to avoid glibc mismatch
FROM rust:latest
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Cache dependencies
COPY Cargo.toml ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release 2>/dev/null || true
RUN rm -rf src

# Build application
COPY src/ src/
COPY migrations/ migrations/
RUN touch src/main.rs && cargo build --release

# Generate JWT keys
RUN mkdir -p keys && \
    openssl genpkey -algorithm RSA -out keys/private.pem -pkeyopt rsa_keygen_bits:2048 && \
    openssl rsa -pubout -in keys/private.pem -out keys/public.pem

EXPOSE 8080

CMD ["./target/release/magnetbrains-api"]
