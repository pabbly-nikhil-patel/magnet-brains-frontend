use aws_sdk_s3::Client as S3Client;
use aws_sdk_ses::Client as SesClient;
use redis::Client as RedisClient;
use sqlx::PgPool;

use crate::config::Config;
use crate::utils::jwt::JwtManager;

pub mod auth;
pub mod courses;
pub mod student;
pub mod instructor;
pub mod admin;
pub mod payments;
pub mod upload;
pub mod homepage;

/// Shared application state accessible by all handlers.
pub struct AppState {
    pub db: PgPool,
    pub redis: RedisClient,
    pub jwt_manager: JwtManager,
    pub config: Config,
    pub s3_client: S3Client,
    pub ses_client: SesClient,
}
