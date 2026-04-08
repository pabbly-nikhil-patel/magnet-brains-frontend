use validator::Validate;

use crate::error::AppError;

/// Validate a request body using the validator crate.
/// Returns AppError::Validation if validation fails.
pub fn validate_request<T: Validate>(body: &T) -> Result<(), AppError> {
    body.validate().map_err(AppError::Validation)
}

/// Sanitize a string for use as a slug
pub fn slugify(input: &str) -> String {
    slug::slugify(input)
}
