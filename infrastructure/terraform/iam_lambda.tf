data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# --- Authorizer role: minimal (SSM + logs + dynamodb read for user lookup) ---

resource "aws_iam_role" "authorizer_role" {
  name               = "${var.app_name}-authorizer-exec"
  tags               = merge(local.standard_tags, { name = "${var.app_name}-authorizer-exec" })
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

data "aws_iam_policy_document" "authorizer_role_policy" {
  statement {
    effect    = "Allow"
    actions   = ["ssm:GetParameter", "ssm:GetParameters"]
    resources = ["arn:aws:ssm:${var.aws_region}:${local.web_app_account_id}:parameter/${var.app_name}/*"]
  }

  statement {
    effect = "Allow"
    actions = [
      "dynamodb:Query",
      "dynamodb:GetItem",
    ]
    resources = [
      aws_dynamodb_table.users.arn,
      "${aws_dynamodb_table.users.arn}/index/*",
    ]
  }

  statement {
    effect    = "Allow"
    actions   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["arn:aws:logs:${var.aws_region}:${local.web_app_account_id}:log-group:/aws/lambda/${var.app_name}-authorizer*"]
  }
}

resource "aws_iam_role_policy" "authorizer_role_policy" {
  name   = "${var.app_name}-authorizer-policy"
  role   = aws_iam_role.authorizer_role.id
  policy = data.aws_iam_policy_document.authorizer_role_policy.json
}

# --- Main Lambda role: DynamoDB + SES + SSM + logs ---

resource "aws_iam_role" "lambda_role" {
  name               = "${var.app_name}-lambda-exec"
  tags               = merge(local.standard_tags, { name = "${var.app_name}-lambda-exec" })
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

data "aws_iam_policy_document" "lambda_role_policy" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:BatchGetItem",
      "dynamodb:GetItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:BatchWriteItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
    ]
    resources = [
      aws_dynamodb_table.users.arn,
      "${aws_dynamodb_table.users.arn}/index/*",
      aws_dynamodb_table.picks.arn,
      "${aws_dynamodb_table.picks.arn}/index/*",
      aws_dynamodb_table.votes.arn,
      "${aws_dynamodb_table.votes.arn}/index/*",
      aws_dynamodb_table.poll_runs.arn,
      "${aws_dynamodb_table.poll_runs.arn}/index/*",
      aws_dynamodb_table.race_results.arn,
      "${aws_dynamodb_table.race_results.arn}/index/*",
      aws_dynamodb_table.visits.arn,
      "${aws_dynamodb_table.visits.arn}/index/*",
    ]
  }

  statement {
    effect    = "Allow"
    actions   = ["ssm:GetParameter", "ssm:GetParameters"]
    resources = ["arn:aws:ssm:${var.aws_region}:${local.web_app_account_id}:parameter/${var.app_name}/*"]
  }

  statement {
    effect    = "Allow"
    actions   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["arn:aws:logs:${var.aws_region}:${local.web_app_account_id}:log-group:/aws/lambda/${var.app_name}-*"]
  }

  statement {
    effect    = "Allow"
    actions   = ["xray:PutTraceSegments", "xray:PutTelemetryRecords"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "lambda_role_policy" {
  name   = "${var.app_name}-lambda-policy"
  role   = aws_iam_role.lambda_role.id
  policy = data.aws_iam_policy_document.lambda_role_policy.json
}

# --- API Gateway → Authorizer invoke role ---

resource "aws_iam_role" "apigw_authorizer_invoke" {
  name = "${var.app_name}-apigw-authorizer-invoke"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "apigateway.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  tags = local.standard_tags
}

resource "aws_iam_role_policy" "apigw_authorizer_invoke" {
  name = "${var.app_name}-apigw-authorizer-invoke"
  role = aws_iam_role.apigw_authorizer_invoke.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "lambda:InvokeFunction"
      Resource = aws_lambda_function.authorizer.arn
    }]
  })
}

# --- API Gateway CloudWatch role (account-level singleton) ---

resource "aws_iam_role" "api_gateway_cloudwatch" {
  name = "${var.app_name}-apigw-cloudwatch"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "apigateway.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  tags = local.standard_tags
}

resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch" {
  role       = aws_iam_role.api_gateway_cloudwatch.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}
