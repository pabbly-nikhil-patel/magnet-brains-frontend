use aws_sdk_s3::presigning::PresigningConfig;
use aws_sdk_s3::Client as S3Client;
use std::time::Duration;

pub async fn create_s3_client(region: &str) -> S3Client {
    let config = aws_config::defaults(aws_config::BehaviorVersion::latest())
        .region(aws_config::Region::new(region.to_string()))
        .load()
        .await;
    S3Client::new(&config)
}

pub async fn generate_presigned_upload_url(
    client: &S3Client,
    bucket: &str,
    key: &str,
    content_type: &str,
    expires_in_secs: u64,
) -> Result<String, aws_sdk_s3::error::SdkError<aws_sdk_s3::operation::put_object::PutObjectError>>
{
    let presigning_config = PresigningConfig::builder()
        .expires_in(Duration::from_secs(expires_in_secs))
        .build()
        .expect("Invalid presigning config");

    let presigned = client
        .put_object()
        .bucket(bucket)
        .key(key)
        .content_type(content_type)
        .presigned(presigning_config)
        .await?;

    Ok(presigned.uri().to_string())
}

pub async fn generate_presigned_download_url(
    client: &S3Client,
    bucket: &str,
    key: &str,
    expires_in_secs: u64,
) -> Result<String, aws_sdk_s3::error::SdkError<aws_sdk_s3::operation::get_object::GetObjectError>>
{
    let presigning_config = PresigningConfig::builder()
        .expires_in(Duration::from_secs(expires_in_secs))
        .build()
        .expect("Invalid presigning config");

    let presigned = client
        .get_object()
        .bucket(bucket)
        .key(key)
        .presigned(presigning_config)
        .await?;

    Ok(presigned.uri().to_string())
}

pub async fn delete_s3_object(
    client: &S3Client,
    bucket: &str,
    key: &str,
) -> Result<(), aws_sdk_s3::error::SdkError<aws_sdk_s3::operation::delete_object::DeleteObjectError>>
{
    client
        .delete_object()
        .bucket(bucket)
        .key(key)
        .send()
        .await?;
    Ok(())
}
