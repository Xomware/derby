locals {
  auth_lambdas = [
    { name = "auth_signup", description = "POST /auth/signup", path_part = "signup", http_method = "POST", authorization = "NONE" },
    { name = "auth_login", description = "POST /auth/login", path_part = "login", http_method = "POST", authorization = "NONE" },
    { name = "auth_logout", description = "POST /auth/logout", path_part = "logout", http_method = "POST", authorization = "NONE" },
    { name = "auth_me", description = "GET /auth/me", path_part = "me", http_method = "GET", authorization = "CUSTOM" },
    { name = "auth_update_username", description = "POST /auth/update-username", path_part = "update-username", http_method = "POST", authorization = "CUSTOM" },
  ]
}

resource "aws_lambda_function" "auth" {
  for_each         = { for l in local.auth_lambdas : l.name => l }
  function_name    = "${var.app_name}-${replace(each.key, "_", "-")}"
  description      = each.value.description
  filename         = "${path.module}/templates/lambda_stub.zip"
  source_code_hash = filebase64sha256("${path.module}/templates/lambda_stub.zip")
  handler          = "handler.handler"
  layers           = [aws_lambda_layer_version.lambda_layer.arn]
  runtime          = var.lambda_runtime
  memory_size      = var.lambda_memory_size
  timeout          = var.lambda_timeout
  role             = aws_iam_role.lambda_role.arn

  environment {
    variables = local.lambda_variables
  }

  tracing_config { mode = var.lambda_trace_mode }
  tags = merge(local.standard_tags, { name = "${var.app_name}-${replace(each.key, "_", "-")}", lambda_type = "auth" })

  lifecycle {
    ignore_changes = [filename, source_code_hash, layers, description]
  }

  depends_on = [aws_iam_role_policy.lambda_role_policy]
}
