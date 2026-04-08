use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::user::UserRole;

/// Ensure the authenticated user has the required role.
pub fn require_role(auth_user: &AuthUser, required_role: UserRole) -> Result<(), AppError> {
    if auth_user.role != required_role.as_str() {
        return Err(AppError::Forbidden);
    }
    Ok(())
}

/// Ensure the authenticated user has one of the allowed roles.
pub fn require_any_role(auth_user: &AuthUser, roles: &[UserRole]) -> Result<(), AppError> {
    for role in roles {
        if auth_user.role == role.as_str() {
            return Ok(());
        }
    }
    Err(AppError::Forbidden)
}
