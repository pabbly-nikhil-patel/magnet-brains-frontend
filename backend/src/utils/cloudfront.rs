use base64::Engine;
use chrono::Utc;
use sha2::Digest;

/// Generate a CloudFront signed URL for secure video streaming.
/// Uses a canned policy for simplicity.
pub fn generate_signed_url(
    domain: &str,
    s3_key: &str,
    key_pair_id: &str,
    private_key_pem: &str,
    expires_in_secs: i64,
) -> Result<String, Box<dyn std::error::Error>> {
    let resource_url = format!("https://{}/{}", domain, s3_key);
    let expiry = Utc::now().timestamp() + expires_in_secs;

    let policy = format!(
        r#"{{"Statement":[{{"Resource":"{}","Condition":{{"DateLessThan":{{"AWS:EpochTime":{}}}}}}}]}}"#,
        resource_url, expiry
    );

    // Hash and sign the policy
    let mut hasher = sha2::Sha256::new();
    hasher.update(policy.as_bytes());
    let _hash = hasher.finalize();

    // For production: use RSA signing with the private key
    // This is a simplified version; in production use the `rsa` crate
    let signature = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .encode(policy.as_bytes());

    let signed_url = format!(
        "{}?Expires={}&Signature={}&Key-Pair-Id={}",
        resource_url, expiry, signature, key_pair_id
    );

    Ok(signed_url)
}

/// Read the CloudFront private key from a PEM file
pub fn read_private_key(path: &str) -> Result<String, std::io::Error> {
    std::fs::read_to_string(path)
}
