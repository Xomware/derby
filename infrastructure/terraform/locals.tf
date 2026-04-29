locals {
  domain_name     = "${var.app_name}${var.domain_suffix}"
  api_domain_name = "api.${local.domain_name}"

  web_app_account_id = data.aws_caller_identity.web_app_account.account_id

  standard_tags = {
    "source"   = "terraform"
    "app_name" = var.app_name
  }

  # Lambda env shared across handlers.
  lambda_variables = {
    APP_NAME              = var.app_name
    APP_BASE_URL          = "https://${local.domain_name}"
    COOKIE_DOMAIN         = ".xomware.com"
    CORS_ALLOW_ORIGIN     = var.cors_allowed_origins
    EVENT_ID              = var.event_id
    EVENT_NAME            = var.event_name
    FROM_EMAIL            = var.from_email
    ADMIN_EMAILS          = var.admin_emails
    USERS_TABLE           = aws_dynamodb_table.users.id
    MAGIC_LINK_TABLE      = aws_dynamodb_table.magic_link_tokens.id
    PICKS_TABLE           = aws_dynamodb_table.picks.id
    VOTES_TABLE           = aws_dynamodb_table.votes.id
    POLL_RUNS_TABLE       = aws_dynamodb_table.poll_runs.id
    POLL_ENABLED          = var.poll_enabled ? "true" : "false"
    POLL_WINDOW_START_UTC = var.poll_window_start_utc
    POLL_WINDOW_END_UTC   = var.poll_window_end_utc
    POLL_PROVIDER         = var.poll_provider
    AWS_ACCOUNT_ID        = local.web_app_account_id
  }

  api_allow_headers = [
    "Authorization",
    "Content-Type",
    "Cookie",
    "X-Amz-Date",
    "X-Api-Key",
    "Origin",
    "Accept",
    "Access-Control-Allow-Origin",
  ]
}

resource "random_password" "jwt_secret" {
  length  = 48
  special = false
}
