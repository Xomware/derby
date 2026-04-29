resource "aws_lambda_function" "authorizer" {
  function_name    = "${var.app_name}-authorizer"
  description      = "JWT authorizer (cookie or Bearer)"
  filename         = "${path.module}/templates/lambda_stub.zip"
  source_code_hash = filebase64sha256("${path.module}/templates/lambda_stub.zip")
  handler          = "handler.handler"
  runtime          = var.lambda_runtime
  memory_size      = 256
  timeout          = var.lambda_timeout
  role             = aws_iam_role.authorizer_role.arn
  layers           = [aws_lambda_layer_version.lambda_layer.arn]

  environment {
    variables = {
      APP_NAME             = var.app_name
      USERS_TABLE          = aws_dynamodb_table.users.id
      USERS_ID_INDEX       = "id-index"
      JWT_SECRET_PARAMETER = aws_ssm_parameter.jwt_secret.name
    }
  }

  tracing_config {
    mode = var.lambda_trace_mode
  }

  tags = merge(local.standard_tags, { name = "${var.app_name}-authorizer" })

  lifecycle {
    ignore_changes = [filename, source_code_hash, layers, description]
  }

  depends_on = [aws_iam_role_policy.authorizer_role_policy]
}
