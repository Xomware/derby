resource "aws_lambda_layer_version" "lambda_layer" {
  description         = "Common helpers + 3rd-party deps for ${var.app_name}"
  layer_name          = "${var.app_name}-shared-packages"
  filename            = "${path.module}/templates/lambda_stub.zip"
  source_code_hash    = filebase64sha256("${path.module}/templates/lambda_stub.zip")
  compatible_runtimes = [var.lambda_runtime]

  lifecycle {
    ignore_changes = [
      description,
      filename,
      source_code_hash,
    ]
  }
}
