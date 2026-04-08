use aws_sdk_ses::Client as SesClient;

use crate::config::Config;
use crate::error::AppError;

pub async fn create_ses_client(region: &str) -> SesClient {
    let config = aws_config::defaults(aws_config::BehaviorVersion::latest())
        .region(aws_config::Region::new(region.to_string()))
        .load()
        .await;
    SesClient::new(&config)
}

/// Send a transactional email via AWS SES.
pub async fn send_email(
    ses_client: &SesClient,
    from: &str,
    to: &str,
    subject: &str,
    html_body: &str,
) -> Result<(), AppError> {
    ses_client
        .send_email()
        .source(from)
        .destination(
            aws_sdk_ses::types::Destination::builder()
                .to_addresses(to)
                .build(),
        )
        .message(
            aws_sdk_ses::types::Message::builder()
                .subject(
                    aws_sdk_ses::types::Content::builder()
                        .data(subject)
                        .charset("UTF-8")
                        .build()
                        .expect("Invalid subject"),
                )
                .body(
                    aws_sdk_ses::types::Body::builder()
                        .html(
                            aws_sdk_ses::types::Content::builder()
                                .data(html_body)
                                .charset("UTF-8")
                                .build()
                                .expect("Invalid body"),
                        )
                        .build(),
                )
                .build(),
        )
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("SES error: {}", e)))?;

    Ok(())
}

/// Send welcome email after registration.
pub async fn send_welcome_email(
    ses_client: &SesClient,
    config: &Config,
    to_email: &str,
    full_name: &str,
) -> Result<(), AppError> {
    let subject = "Welcome to Magnet Brains!";
    let html = format!(
        r#"
        <h2>Welcome, {}!</h2>
        <p>Thank you for joining Magnet Brains. Start exploring our courses today!</p>
        <p><a href="{}">Browse Courses</a></p>
        "#,
        full_name, config.frontend_url
    );

    send_email(ses_client, &config.ses_from_email, to_email, subject, &html).await
}

/// Send password reset email.
pub async fn send_password_reset_email(
    ses_client: &SesClient,
    config: &Config,
    to_email: &str,
    reset_token: &str,
) -> Result<(), AppError> {
    let reset_link = format!("{}/reset-password?token={}", config.frontend_url, reset_token);
    let subject = "Reset Your Password - Magnet Brains";
    let html = format!(
        r#"
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password. This link expires in 30 minutes.</p>
        <p><a href="{}">Reset Password</a></p>
        <p>If you didn't request this, please ignore this email.</p>
        "#,
        reset_link
    );

    send_email(ses_client, &config.ses_from_email, to_email, subject, &html).await
}

/// Send purchase confirmation email.
pub async fn send_purchase_confirmation(
    ses_client: &SesClient,
    config: &Config,
    to_email: &str,
    course_title: &str,
    amount: f64,
) -> Result<(), AppError> {
    let subject = format!("Purchase Confirmed - {}", course_title);
    let html = format!(
        r#"
        <h2>Purchase Confirmed!</h2>
        <p>You have successfully purchased <strong>{}</strong> for ₹{:.2}.</p>
        <p><a href="{}/my-courses">Go to My Courses</a></p>
        "#,
        course_title, amount, config.frontend_url
    );

    send_email(ses_client, &config.ses_from_email, to_email, &subject, &html).await
}
