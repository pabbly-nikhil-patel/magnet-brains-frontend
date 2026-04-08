use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Progress {
    pub id: Uuid,
    pub user_id: Uuid,
    pub lecture_id: Uuid,
    pub course_id: Uuid,
    pub watched_seconds: i32,
    pub is_completed: bool,
    pub last_watched_at: DateTime<Utc>,
}
