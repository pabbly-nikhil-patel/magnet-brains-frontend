use axum::{
    middleware,
    routing::{delete, get, post, put},
    Router,
};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use crate::handlers;
use crate::handlers::AppState;
use crate::middleware::auth::auth_middleware;

pub fn create_router(state: Arc<AppState>) -> Router {
    // --- Public routes (no auth required) ---
    let public_routes = Router::new()
        .route("/homepage", get(handlers::homepage::get_homepage))
        .route("/categories", get(handlers::courses::get_categories))
        .route(
            "/categories/{slug}/courses",
            get(handlers::courses::get_category_courses),
        );

    let course_routes = Router::new()
        .route("/", get(handlers::courses::list_courses))
        .route("/search", get(handlers::courses::search_courses))
        .route("/{slug}", get(handlers::courses::get_course));

    // --- Auth routes ---
    let auth_public = Router::new()
        .route("/register", post(handlers::auth::register))
        .route("/login", post(handlers::auth::login))
        .route("/refresh", post(handlers::auth::refresh_token))
        .route("/forgot-password", post(handlers::auth::forgot_password))
        .route("/reset-password", post(handlers::auth::reset_password));

    let auth_protected = Router::new()
        .route("/me", get(handlers::auth::get_me))
        .route("/profile", put(handlers::auth::update_profile))
        .route("/change-password", put(handlers::auth::change_password))
        .route("/logout", post(handlers::auth::logout))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            auth_middleware,
        ));

    let auth_routes = Router::new()
        .merge(auth_public)
        .merge(auth_protected);

    // --- Student routes (auth required) ---
    let student_routes = Router::new()
        .route("/enroll/{course_id}", post(handlers::student::enroll))
        .route("/enrollments", get(handlers::student::list_enrollments))
        .route(
            "/progress/{course_id}",
            get(handlers::student::get_progress),
        )
        .route("/progress", post(handlers::student::update_progress))
        .route("/bookmarks", get(handlers::student::list_bookmarks))
        .route("/bookmarks", post(handlers::student::add_bookmark))
        .route(
            "/bookmarks/{id}",
            delete(handlers::student::remove_bookmark),
        )
        .route("/dashboard", get(handlers::student::dashboard))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            auth_middleware,
        ));

    // --- Payment routes (auth required) ---
    let payment_routes = Router::new()
        .route("/create-order", post(handlers::payments::create_order))
        .route("/verify", post(handlers::payments::verify_payment))
        .route("/history", get(handlers::payments::payment_history))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            auth_middleware,
        ));

    // --- Instructor routes (auth required) ---
    let instructor_routes = Router::new()
        .route("/courses", get(handlers::instructor::list_my_courses))
        .route("/courses", post(handlers::instructor::create_course))
        .route("/courses/{id}", put(handlers::instructor::update_course))
        .route(
            "/courses/{id}",
            delete(handlers::instructor::delete_course),
        )
        .route(
            "/courses/{id}/submit",
            post(handlers::instructor::submit_course),
        )
        .route(
            "/courses/{course_id}/chapters",
            post(handlers::instructor::create_chapter),
        )
        .route(
            "/chapters/{id}",
            put(handlers::instructor::update_chapter),
        )
        .route(
            "/chapters/{id}",
            delete(handlers::instructor::delete_chapter),
        )
        .route(
            "/chapters/{chapter_id}/lectures",
            post(handlers::instructor::create_lecture),
        )
        .route(
            "/lectures/{id}",
            put(handlers::instructor::update_lecture),
        )
        .route(
            "/lectures/{id}",
            delete(handlers::instructor::delete_lecture),
        )
        .route(
            "/dashboard",
            get(handlers::instructor::instructor_dashboard),
        )
        .route("/earnings", get(handlers::instructor::get_earnings))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            auth_middleware,
        ));

    // --- Upload routes (auth required) ---
    let upload_routes = Router::new()
        .route(
            "/presigned-url",
            post(handlers::upload::get_presigned_upload_url),
        )
        .layer(middleware::from_fn_with_state(
            state.clone(),
            auth_middleware,
        ));

    // --- Lecture streaming (auth required) ---
    let lecture_routes = Router::new()
        .route(
            "/{id}/stream",
            get(handlers::courses::get_lecture_stream),
        )
        .layer(middleware::from_fn_with_state(
            state.clone(),
            auth_middleware,
        ));

    // --- Admin routes (auth required) ---
    let admin_routes = Router::new()
        .route("/users", get(handlers::admin::list_users))
        .route("/users/{id}/role", put(handlers::admin::update_user_role))
        .route(
            "/users/{id}/active",
            put(handlers::admin::toggle_user_active),
        )
        .route("/courses", get(handlers::admin::list_all_courses))
        .route(
            "/courses/{id}/approve",
            put(handlers::admin::approve_course),
        )
        .route(
            "/courses/{id}/reject",
            put(handlers::admin::reject_course),
        )
        .route("/categories", post(handlers::admin::create_category))
        .route(
            "/categories/{id}",
            put(handlers::admin::update_category),
        )
        .route(
            "/categories/{id}",
            delete(handlers::admin::delete_category),
        )
        .route("/analytics", get(handlers::admin::get_analytics))
        .route(
            "/revenue/settings",
            put(handlers::admin::update_revenue_settings),
        )
        .route(
            "/revenue/override",
            put(handlers::admin::set_instructor_revenue_override),
        )
        .route("/payouts", get(handlers::admin::list_pending_payouts))
        .route(
            "/payouts/process",
            post(handlers::admin::process_payouts),
        )
        .route(
            "/homepage",
            post(handlers::homepage::create_homepage_content),
        )
        .route(
            "/homepage/{id}",
            put(handlers::homepage::update_homepage_content),
        )
        .layer(middleware::from_fn_with_state(
            state.clone(),
            auth_middleware,
        ));

    // --- Webhook routes (no auth — verified by signature) ---
    let webhook_routes = Router::new()
        .route("/razorpay", post(handlers::payments::razorpay_webhook));

    // --- Assemble the API ---
    let api = Router::new()
        .merge(public_routes)
        .nest("/courses", course_routes)
        .nest("/auth", auth_routes)
        .nest("/student", student_routes)
        .nest("/payments", payment_routes)
        .nest("/instructor", instructor_routes)
        .nest("/upload", upload_routes)
        .nest("/lectures", lecture_routes)
        .nest("/admin", admin_routes)
        .nest("/webhooks", webhook_routes);

    // --- CORS ---
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // --- Root router ---
    Router::new()
        .nest("/api", api)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
