resource "aws_ssm_parameter" "jwt_secret" {
  name        = "/${var.app_name}/api/JWT_SECRET"
  description = "JWT signing key for ${var.app_name} sessions"
  type        = "SecureString"
  value       = var.jwt_secret != "" ? var.jwt_secret : random_password.jwt_secret.result

  lifecycle { ignore_changes = [tags, tags_all, value] }
}

resource "aws_ssm_parameter" "api_id" {
  name        = "/${var.app_name}/api/API_ID"
  description = "API Gateway REST API ID for ${var.app_name}"
  type        = "String"
  value       = module.api.rest_api_id
  overwrite   = true

  lifecycle { ignore_changes = [tags, tags_all] }
}

resource "aws_ssm_parameter" "api_invoke_url" {
  name        = "/${var.app_name}/api/API_INVOKE_URL"
  description = "Stage invoke URL for ${var.app_name} API"
  type        = "String"
  value       = module.api.stage_invoke_url
  overwrite   = true

  lifecycle { ignore_changes = [tags, tags_all] }
}
