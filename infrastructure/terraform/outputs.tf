output "web_domain" {
  value = local.domain_name
}

output "api_domain" {
  value = local.api_domain_name
}

output "api_invoke_url" {
  value = module.api.stage_invoke_url
}

output "rest_api_id" {
  value = module.api.rest_api_id
}

output "s3_bucket_arn" {
  value = module.web.s3_bucket_arn
}

output "cloudfront_distribution_id" {
  value = module.web.cloudfront_distribution_id
}

output "users_table" {
  value = aws_dynamodb_table.users.id
}

output "picks_table" {
  value = aws_dynamodb_table.picks.id
}
