locals {
  predictions_lambdas = [
    { name = "predictions_upsert", description = "POST /predictions/upsert — anonymous-username pick submission", path_part = "upsert", http_method = "POST", authorization = "NONE" },
    { name = "predictions_list", description = "GET /predictions/list — your pick + others (gated until post time)", path_part = "list", http_method = "GET", authorization = "NONE" },
  ]

  comments_lambdas = [
    { name = "comments_post", description = "POST /comments/post — anonymous comment", path_part = "post", http_method = "POST", authorization = "NONE" },
    { name = "comments_list", description = "GET /comments/list — comments for an event", path_part = "list", http_method = "GET", authorization = "NONE" },
  ]
}

resource "aws_lambda_function" "predictions" {
  for_each         = { for l in local.predictions_lambdas : l.name => l }
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

  environment { variables = local.lambda_variables }
  tracing_config { mode = var.lambda_trace_mode }
  tags = merge(local.standard_tags, { name = "${var.app_name}-${replace(each.key, "_", "-")}", lambda_type = "predictions" })

  lifecycle { ignore_changes = [filename, source_code_hash, layers, description] }
  depends_on = [aws_iam_role_policy.lambda_role_policy]
}

resource "aws_lambda_function" "comments" {
  for_each         = { for l in local.comments_lambdas : l.name => l }
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

  environment { variables = local.lambda_variables }
  tracing_config { mode = var.lambda_trace_mode }
  tags = merge(local.standard_tags, { name = "${var.app_name}-${replace(each.key, "_", "-")}", lambda_type = "comments" })

  lifecycle { ignore_changes = [filename, source_code_hash, layers, description] }
  depends_on = [aws_iam_role_policy.lambda_role_policy]
}
