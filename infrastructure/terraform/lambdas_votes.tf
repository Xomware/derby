locals {
  votes_lambdas = [
    { name = "votes_upsert", description = "POST /votes", path_part = "cast", http_method = "POST", authorization = "CUSTOM" },
    { name = "votes_me", description = "GET /votes/me", path_part = "mine", http_method = "GET", authorization = "CUSTOM" },
  ]
}

resource "aws_lambda_function" "votes" {
  for_each         = { for l in local.votes_lambdas : l.name => l }
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
  tags = merge(local.standard_tags, { name = "${var.app_name}-${replace(each.key, "_", "-")}", lambda_type = "votes" })

  lifecycle { ignore_changes = [filename, source_code_hash, layers, description] }
  depends_on = [aws_iam_role_policy.lambda_role_policy]
}
