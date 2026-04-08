mod app;
mod config;
mod db;
mod dto;
mod error;
mod handlers;
mod middleware;
mod models;
mod services;
mod utils;

use std::net::SocketAddr;
use std::sync::Arc;
use tracing_subscriber::EnvFilter;

use crate::config::Config;
use crate::handlers::AppState;
use crate::utils::jwt::JwtManager;

#[tokio::main]
async fn main() {
    // Load .env
    dotenvy::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    // Load config
    let config = Config::from_env();
    tracing::info!("Starting server on {}:{}", config.host, config.port);

    // Database pool
    let db = db::pool::create_pool(&config.database_url, config.database_max_connections).await;
    tracing::info!("Database pool created");

    // Redis (optional — app works without it, rate limiting just won't apply)
    let redis = redis::Client::open(config.redis_url.as_str())
        .unwrap_or_else(|e| {
            tracing::warn!("Redis not available: {}. Rate limiting disabled.", e);
            redis::Client::open("redis://localhost:6379").unwrap()
        });
    tracing::info!("Redis client created");

    // JWT Manager
    let jwt_manager = JwtManager::new(&config.jwt_private_key_path, &config.jwt_public_key_path);
    tracing::info!("JWT manager initialized");

    // AWS S3 Client
    let s3_client = utils::s3::create_s3_client(&config.aws_region).await;
    tracing::info!("S3 client created");

    // AWS SES Client
    let ses_client = services::email_service::create_ses_client(&config.aws_region).await;
    tracing::info!("SES client created");

    // Build shared state
    let state = Arc::new(AppState {
        db,
        redis,
        jwt_manager,
        config: config.clone(),
        s3_client,
        ses_client,
    });

    // Build router
    let app = app::create_router(state);

    // Start server
    let addr: SocketAddr = format!("{}:{}", config.host, config.port)
        .parse()
        .expect("Invalid server address");

    tracing::info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind");

    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())
        .await
        .expect("Server failed");
}
