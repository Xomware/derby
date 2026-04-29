locals {
  admin_picks_lambdas = [
    { name = "admin_picks_create", description = "POST /admin-picks/create", path_part = "create", http_method = "POST", authorization = "CUSTOM" },
    { name = "admin_picks_update", description = "PATCH /admin-picks/update", path_part = "update", http_method = "POST", authorization = "CUSTOM" },
    { name = "admin_picks_delete", description = "DELETE /admin-picks/delete", path_part = "delete", http_method = "POST", authorization = "CUSTOM" },
    { name = "admin_picks_set_result", description = "PATCH /admin-picks/set-result", path_part = "set-result", http_method = "POST", authorization = "CUSTOM" },
  ]

  admin_users_lambdas = [
    { name = "admin_users_list", description = "GET /admin-users/list", path_part = "list", http_method = "GET", authorization = "CUSTOM" },
  ]

  admin_poll_lambdas = [
    { name = "admin_poll_status", description = "GET /admin-poll/status", path_part = "status", http_method = "GET", authorization = "CUSTOM" },
    { name = "admin_poll_now", description = "POST /admin-poll/now", path_part = "now", http_method = "POST", authorization = "CUSTOM" },
  ]
}

resource "aws_lambda_function" "admin_picks" {
  for_each         = { for l in local.admin_picks_lambdas : l.name => l }
  function_name    = "${var.app_name}-${replace(each.key, "_", "-")}"
  description      = each.value.description
  filename         = "${path.module}/templates/lambda_stub.zip"
  source_code_hash = filebase64sha256("${path.module}/templates/lambda_stub.zip")
  handler          = "lambdas.${each.key}.handler.handler"
  layers           = [aws_lambda_layer_version.lambda_layer.arn]
  runtime          = var.lambda_runtime
  memory_size      = var.lambda_memory_size
  timeout          = var.lambda_timeout
  role             = aws_iam_role.lambda_role.arn

  environment { variables = local.lambda_variables }
  tracing_config { mode = var.lambda_trace_mode }
  tags = merge(local.standard_tags, { name = "${var.app_name}-${replace(each.key, "_", "-")}", lambda_type = "admin" })

  lifecycle { ignore_changes = [filename, source_code_hash, layers, description] }
  depends_on = [aws_iam_role_policy.lambda_role_policy]
}

resource "aws_lambda_function" "admin_users" {
  for_each         = { for l in local.admin_users_lambdas : l.name => l }
  function_name    = "${var.app_name}-${replace(each.key, "_", "-")}"
  description      = each.value.description
  filename         = "${path.module}/templates/lambda_stub.zip"
  source_code_hash = filebase64sha256("${path.module}/templates/lambda_stub.zip")
  handler          = "lambdas.${each.key}.handler.handler"
  layers           = [aws_lambda_layer_version.lambda_layer.arn]
  runtime          = var.lambda_runtime
  memory_size      = var.lambda_memory_size
  timeout          = var.lambda_timeout
  role             = aws_iam_role.lambda_role.arn

  environment { variables = local.lambda_variables }
  tracing_config { mode = var.lambda_trace_mode }
  tags = merge(local.standard_tags, { name = "${var.app_name}-${replace(each.key, "_", "-")}", lambda_type = "admin" })

  lifecycle { ignore_changes = [filename, source_code_hash, layers, description] }
  depends_on = [aws_iam_role_policy.lambda_role_policy]
}

resource "aws_lambda_function" "admin_poll" {
  for_each         = { for l in local.admin_poll_lambdas : l.name => l }
  function_name    = "${var.app_name}-${replace(each.key, "_", "-")}"
  description      = each.value.description
  filename         = "${path.module}/templates/lambda_stub.zip"
  source_code_hash = filebase64sha256("${path.module}/templates/lambda_stub.zip")
  handler          = "lambdas.${each.key}.handler.handler"
  layers           = [aws_lambda_layer_version.lambda_layer.arn]
  runtime          = var.lambda_runtime
  memory_size      = var.lambda_memory_size
  timeout          = var.lambda_timeout
  role             = aws_iam_role.lambda_role.arn

  environment { variables = local.lambda_variables }
  tracing_config { mode = var.lambda_trace_mode }
  tags = merge(local.standard_tags, { name = "${var.app_name}-${replace(each.key, "_", "-")}", lambda_type = "admin" })

  lifecycle { ignore_changes = [filename, source_code_hash, layers, description] }
  depends_on = [aws_iam_role_policy.lambda_role_policy]
}
