resource "aws_api_gateway_account" "api_gateway_account" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch.arn
}

locals {
  auth_endpoints = [
    for l in local.auth_lambdas : {
      name          = l.name
      path_part     = l.path_part
      http_method   = l.http_method
      invoke_arn    = aws_lambda_function.auth[l.name].invoke_arn
      authorization = l.authorization
    }
  ]

  picks_endpoints = [
    for l in local.picks_lambdas : {
      name          = l.name
      path_part     = l.path_part
      http_method   = l.http_method
      invoke_arn    = aws_lambda_function.picks[l.name].invoke_arn
      authorization = l.authorization
    }
  ]

  votes_endpoints = [
    for l in local.votes_lambdas : {
      name          = l.name
      path_part     = l.path_part
      http_method   = l.http_method
      invoke_arn    = aws_lambda_function.votes[l.name].invoke_arn
      authorization = l.authorization
    }
  ]

  leaderboard_endpoints = [
    for l in local.leaderboard_lambdas : {
      name          = l.name
      path_part     = l.path_part
      http_method   = l.http_method
      invoke_arn    = aws_lambda_function.leaderboard[l.name].invoke_arn
      authorization = l.authorization
    }
  ]

  admin_picks_endpoints = [
    for l in local.admin_picks_lambdas : {
      name          = l.name
      path_part     = l.path_part
      http_method   = l.http_method
      invoke_arn    = aws_lambda_function.admin_picks[l.name].invoke_arn
      authorization = l.authorization
    }
  ]

  admin_users_endpoints = [
    for l in local.admin_users_lambdas : {
      name          = l.name
      path_part     = l.path_part
      http_method   = l.http_method
      invoke_arn    = aws_lambda_function.admin_users[l.name].invoke_arn
      authorization = l.authorization
    }
  ]

  admin_poll_endpoints = [
    for l in local.admin_poll_lambdas : {
      name          = l.name
      path_part     = l.path_part
      http_method   = l.http_method
      invoke_arn    = aws_lambda_function.admin_poll[l.name].invoke_arn
      authorization = l.authorization
    }
  ]
}

module "api" {
  source = "git::https://github.com/domgiordano/api-gateway-service.git?ref=v2.3.0"

  app_name              = var.app_name
  stage_name            = var.api_stage_name
  authorizer_invoke_arn = aws_lambda_function.authorizer.invoke_arn
  authorizer_role_arn   = aws_iam_role.apigw_authorizer_invoke.arn
  tags                  = local.standard_tags
  allow_headers         = local.api_allow_headers
  allow_origin          = var.cors_allowed_origins

  domain_name     = local.api_domain_name
  certificate_arn = aws_acm_certificate_validation.api.certificate_arn

  services = {
    auth        = { path_prefix = "auth", endpoints = local.auth_endpoints }
    picks       = { path_prefix = "picks", endpoints = local.picks_endpoints }
    votes       = { path_prefix = "votes", endpoints = local.votes_endpoints }
    leaderboard = { path_prefix = "leaderboard", endpoints = local.leaderboard_endpoints }
    admin-picks = { path_prefix = "admin-picks", endpoints = local.admin_picks_endpoints }
    admin-users = { path_prefix = "admin-users", endpoints = local.admin_users_endpoints }
    admin-poll  = { path_prefix = "admin-poll", endpoints = local.admin_poll_endpoints }
  }
}
