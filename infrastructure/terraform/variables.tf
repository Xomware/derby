variable "app_name" {
  type    = string
  default = "derby"
}

variable "domain_suffix" {
  type    = string
  default = ".xomware.com"
}

variable "route53_zone_name" {
  type    = string
  default = "xomware.com"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "from_email" {
  type    = string
  default = "noreply@derby.xomware.com"
}

variable "admin_usernames" {
  description = "Comma-separated usernames auto-promoted to is_admin on signup/login"
  type        = string
  default     = "Sun_God,domjg"
}

variable "event_id" {
  type    = string
  default = "2026-kentucky-derby"
}

variable "event_name" {
  type    = string
  default = "2026 Kentucky Derby"
}

variable "poll_enabled" {
  type    = bool
  default = false
}

variable "poll_window_start_utc" {
  type    = string
  default = "2026-05-02T16:00:00Z"
}

variable "poll_window_end_utc" {
  type    = string
  default = "2026-05-03T00:00:00Z"
}

variable "poll_provider" {
  type    = string
  default = "fake"
}

variable "lock_buffer_seconds" {
  description = "Vote lock cuts off this many seconds before each race's post time."
  type        = number
  default     = 300
}

# Lambda
variable "lambda_runtime" {
  type    = string
  default = "python3.11"
}

variable "lambda_memory_size" {
  type    = number
  default = 256
}

variable "lambda_timeout" {
  type    = number
  default = 10
}

variable "lambda_trace_mode" {
  type    = string
  default = "Active"
}

# JWT secret — auto-generated if not provided.
variable "jwt_secret" {
  description = "JWT signing key. Leave empty to generate via random_password."
  type        = string
  default     = ""
  sensitive   = true
}

# CloudFront / SPA
variable "cloudfront_origin_path" {
  type    = string
  default = ""
}

variable "us_canada_only" {
  type    = bool
  default = true
}

variable "custom_error_response_page_path" {
  type    = string
  default = "/index.html"
}

variable "retain_on_delete" {
  type    = bool
  default = false
}

variable "minimum_tls_version" {
  type    = string
  default = "TLSv1.2_2018"
}

variable "enable_cloudfront_cache" {
  type    = bool
  default = true
}

# API Gateway
variable "api_stage_name" {
  type    = string
  default = "v1"
}

variable "cors_allowed_origins" {
  type    = string
  default = "https://derby.xomware.com"
}
