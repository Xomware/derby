resource "aws_kms_key" "web_app" {
  description         = "${var.app_name} S3 bucket encryption"
  enable_key_rotation = true
  tags                = local.standard_tags

  policy = jsonencode({
    Id      = "${var.app_name}-s3-key-policy"
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "Account root full"
        Effect    = "Allow"
        Principal = { AWS = ["arn:aws:iam::${local.web_app_account_id}:root"] }
        Action    = ["kms:*"]
        Resource  = "*"
      },
      {
        Sid       = "CloudFront read"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = ["kms:Decrypt", "kms:DescribeKey"]
        Resource  = "*"
      },
    ]
  })
}

resource "aws_kms_alias" "web_app" {
  name          = "alias/${var.app_name}-web-app"
  target_key_id = aws_kms_key.web_app.key_id
}
