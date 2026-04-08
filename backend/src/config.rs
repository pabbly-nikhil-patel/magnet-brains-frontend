use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub database_max_connections: u32,
    pub redis_url: String,
    pub jwt_private_key_path: String,
    pub jwt_public_key_path: String,
    pub jwt_access_expiry: i64,
    pub jwt_refresh_expiry: i64,
    pub aws_region: String,
    pub s3_bucket_name: String,
    pub cloudfront_domain: String,
    pub cloudfront_key_pair_id: String,
    pub cloudfront_private_key_path: String,
    pub razorpay_key_id: String,
    pub razorpay_key_secret: String,
    pub razorpay_webhook_secret: String,
    pub ses_from_email: String,
    pub frontend_url: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .expect("PORT must be a number"),
            database_url: env::var("DATABASE_URL").expect("DATABASE_URL required"),
            database_max_connections: env::var("DATABASE_MAX_CONNECTIONS")
                .unwrap_or_else(|_| "20".to_string())
                .parse()
                .unwrap(),
            redis_url: env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://localhost:6379".to_string()),
            jwt_private_key_path: env::var("JWT_PRIVATE_KEY_PATH")
                .expect("JWT_PRIVATE_KEY_PATH required"),
            jwt_public_key_path: env::var("JWT_PUBLIC_KEY_PATH")
                .expect("JWT_PUBLIC_KEY_PATH required"),
            jwt_access_expiry: env::var("JWT_ACCESS_EXPIRY")
                .unwrap_or_else(|_| "900".to_string())
                .parse()
                .unwrap(),
            jwt_refresh_expiry: env::var("JWT_REFRESH_EXPIRY")
                .unwrap_or_else(|_| "604800".to_string())
                .parse()
                .unwrap(),
            aws_region: env::var("AWS_REGION").unwrap_or_else(|_| "ap-south-1".to_string()),
            s3_bucket_name: env::var("S3_BUCKET_NAME").unwrap_or_default(),
            cloudfront_domain: env::var("CLOUDFRONT_DOMAIN").unwrap_or_default(),
            cloudfront_key_pair_id: env::var("CLOUDFRONT_KEY_PAIR_ID").unwrap_or_default(),
            cloudfront_private_key_path: env::var("CLOUDFRONT_PRIVATE_KEY_PATH")
                .unwrap_or_default(),
            razorpay_key_id: env::var("RAZORPAY_KEY_ID").unwrap_or_default(),
            razorpay_key_secret: env::var("RAZORPAY_KEY_SECRET").unwrap_or_default(),
            razorpay_webhook_secret: env::var("RAZORPAY_WEBHOOK_SECRET").unwrap_or_default(),
            ses_from_email: env::var("SES_FROM_EMAIL").unwrap_or_default(),
            frontend_url: env::var("FRONTEND_URL")
                .unwrap_or_else(|_| "http://localhost:5173".to_string()),
        }
    }
}
