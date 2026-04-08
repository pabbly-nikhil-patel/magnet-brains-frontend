use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: Uuid,
    pub email: String,
    pub role: String,
    pub exp: i64,
    pub iat: i64,
}

pub struct JwtManager {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
}

impl JwtManager {
    pub fn new(private_key_path: &str, public_key_path: &str) -> Self {
        let private_key =
            std::fs::read(private_key_path).expect("Failed to read JWT private key");
        let public_key = std::fs::read(public_key_path).expect("Failed to read JWT public key");

        Self {
            encoding_key: EncodingKey::from_rsa_pem(&private_key)
                .expect("Invalid RSA private key"),
            decoding_key: DecodingKey::from_rsa_pem(&public_key).expect("Invalid RSA public key"),
        }
    }

    pub fn generate_access_token(
        &self,
        user_id: Uuid,
        email: &str,
        role: &str,
        expiry_seconds: i64,
    ) -> Result<String, jsonwebtoken::errors::Error> {
        let now = chrono::Utc::now().timestamp();
        let claims = Claims {
            sub: user_id,
            email: email.to_string(),
            role: role.to_string(),
            exp: now + expiry_seconds,
            iat: now,
        };
        encode(&Header::new(jsonwebtoken::Algorithm::RS256), &claims, &self.encoding_key)
    }

    pub fn verify_token(&self, token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
        let mut validation = Validation::new(jsonwebtoken::Algorithm::RS256);
        validation.validate_exp = true;
        let token_data = decode::<Claims>(token, &self.decoding_key, &validation)?;
        Ok(token_data.claims)
    }
}
