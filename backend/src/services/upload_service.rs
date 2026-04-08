use uuid::Uuid;

use crate::config::Config;
use crate::dto::instructor_dto::{UploadRequest, UploadResponse};
use crate::error::AppError;
use crate::utils::s3;

/// Generate a presigned upload URL for S3.
pub async fn generate_upload_url(
    s3_client: &aws_sdk_s3::Client,
    config: &Config,
    instructor_id: Uuid,
    request: &UploadRequest,
) -> Result<UploadResponse, AppError> {
    let extension = request
        .file_name
        .rsplit('.')
        .next()
        .unwrap_or("bin");

    let s3_key = match request.upload_type.as_str() {
        "video" => format!(
            "videos/{}/{}.{}",
            instructor_id,
            Uuid::new_v4(),
            extension
        ),
        "thumbnail" => format!(
            "thumbnails/{}/{}.{}",
            instructor_id,
            Uuid::new_v4(),
            extension
        ),
        "attachment" => format!(
            "attachments/{}/{}.{}",
            instructor_id,
            Uuid::new_v4(),
            extension
        ),
        "avatar" => format!(
            "avatars/{}/{}.{}",
            instructor_id,
            Uuid::new_v4(),
            extension
        ),
        _ => {
            return Err(AppError::BadRequest(format!(
                "Invalid upload type: {}",
                request.upload_type
            )));
        }
    };

    let upload_url = s3::generate_presigned_upload_url(
        s3_client,
        &config.s3_bucket_name,
        &s3_key,
        &request.content_type,
        3600, // 1 hour
    )
    .await
    .map_err(|e| AppError::Internal(format!("S3 presign error: {}", e)))?;

    let public_url = if config.cloudfront_domain.is_empty() {
        format!(
            "https://{}.s3.{}.amazonaws.com/{}",
            config.s3_bucket_name, config.aws_region, s3_key
        )
    } else {
        format!("https://{}/{}", config.cloudfront_domain, s3_key)
    };

    Ok(UploadResponse {
        upload_url,
        s3_key,
        public_url,
    })
}
