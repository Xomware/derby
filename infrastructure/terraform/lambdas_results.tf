locals {
  results_lambdas = [
    { name = "results_list", description = "GET /results — race finishers", path_part = "list", http_method = "GET", authorization = "NONE" },
  ]

  admin_results_lambdas = [
    { name = "admin_results_set", description = "POST /admin-results/set — manual race entry (admin_token in body)", path_part = "set", http_method = "POST", authorization = "NONE" },
    { name = "admin_check", description = "POST /admin-results/check — verify admin password", path_part = "check", http_method = "POST", authorization = "NONE" },
    { name = "admin_odds_update", description = "POST /admin-results/odds — bulk update horse odds", path_part = "odds", http_method = "POST", authorization = "NONE" },
    { name = "admin_cron_runs", description = "POST /admin-results/cron-runs — recent cron summaries", path_part = "cron-runs", http_method = "POST", authorization = "NONE" },
    { name = "admin_run_cron", description = "POST /admin-results/run-cron — manually invoke odds cron", path_part = "run-cron", http_method = "POST", authorization = "NONE" },
    { name = "admin_picks_stats", description = "POST /admin-results/picks-stats — bulk-edit per-pick stat fields", path_part = "picks-stats", http_method = "POST", authorization = "NONE" },
    { name = "admin_post_time", description = "POST /admin-results/post-time — bump race_post_time on all picks for an event", path_part = "post-time", http_method = "POST", authorization = "NONE" },
  ]
}

resource "aws_lambda_function" "results" {
  for_each         = { for l in local.results_lambdas : l.name => l }
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
  tags = merge(local.standard_tags, { name = "${var.app_name}-${replace(each.key, "_", "-")}", lambda_type = "results" })

  lifecycle { ignore_changes = [filename, source_code_hash, layers, description] }
  depends_on = [aws_iam_role_policy.lambda_role_policy]
}

resource "aws_lambda_function" "admin_results" {
  for_each         = { for l in local.admin_results_lambdas : l.name => l }
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
  tags = merge(local.standard_tags, { name = "${var.app_name}-${replace(each.key, "_", "-")}", lambda_type = "admin" })

  lifecycle { ignore_changes = [filename, source_code_hash, layers, description] }
  depends_on = [aws_iam_role_policy.lambda_role_policy]
}
