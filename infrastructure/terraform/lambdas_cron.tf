resource "aws_lambda_function" "cron_poll_results" {
  function_name    = "${var.app_name}-cron-poll-results"
  description      = "Race-day poll trigger (EventBridge schedule)"
  filename         = "${path.module}/templates/lambda_stub.zip"
  source_code_hash = filebase64sha256("${path.module}/templates/lambda_stub.zip")
  handler          = "lambdas.cron_poll_results.handler.handler"
  layers           = [aws_lambda_layer_version.lambda_layer.arn]
  runtime          = var.lambda_runtime
  memory_size      = var.lambda_memory_size
  timeout          = 60
  role             = aws_iam_role.lambda_role.arn

  environment { variables = local.lambda_variables }
  tracing_config { mode = var.lambda_trace_mode }
  tags = merge(local.standard_tags, { name = "${var.app_name}-cron-poll-results", lambda_type = "cron" })

  lifecycle { ignore_changes = [filename, source_code_hash, layers, description] }
  depends_on = [aws_iam_role_policy.lambda_role_policy]
}

# EventBridge schedule — every 5 min during the configured window. Schedules are
# UTC; the Lambda also enforces window via env vars so a misconfigured rule
# can't accidentally drain DynamoDB outside race day.

resource "aws_cloudwatch_event_rule" "poll_schedule" {
  name                = "${var.app_name}-poll-schedule"
  description         = "Race-day polling for ${var.app_name}"
  schedule_expression = "rate(5 minutes)"
  is_enabled          = var.poll_enabled
  tags                = local.standard_tags
}

resource "aws_cloudwatch_event_target" "poll_target" {
  rule      = aws_cloudwatch_event_rule.poll_schedule.name
  target_id = "${var.app_name}-poll-target"
  arn       = aws_lambda_function.cron_poll_results.arn
}

resource "aws_lambda_permission" "poll_eventbridge_invoke" {
  statement_id  = "${var.app_name}-allow-eventbridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cron_poll_results.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.poll_schedule.arn
}
