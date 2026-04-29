########################################
# users — PK email, GSI by username, GSI by id
########################################
resource "aws_dynamodb_table" "users" {
  name         = "${var.app_name}-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "email"

  attribute {
    name = "email"
    type = "S"
  }
  attribute {
    name = "username"
    type = "S"
  }
  attribute {
    name = "id"
    type = "S"
  }

  global_secondary_index {
    name            = "username-index"
    hash_key        = "username"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "id-index"
    hash_key        = "id"
    projection_type = "ALL"
  }

  point_in_time_recovery { enabled = true }

  tags = merge(local.standard_tags, { "name" = "${var.app_name}-users" })
}

########################################
# magic_link_tokens — PK token, GSI email, TTL on expires_at
########################################
resource "aws_dynamodb_table" "magic_link_tokens" {
  name         = "${var.app_name}-magic-link-tokens"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "token"

  attribute {
    name = "token"
    type = "S"
  }
  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = merge(local.standard_tags, { "name" = "${var.app_name}-magic-link-tokens" })
}

########################################
# picks — PK id, GSI event_id
########################################
resource "aws_dynamodb_table" "picks" {
  name         = "${var.app_name}-picks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
  attribute {
    name = "event_id"
    type = "S"
  }

  global_secondary_index {
    name            = "event-index"
    hash_key        = "event_id"
    projection_type = "ALL"
  }

  point_in_time_recovery { enabled = true }

  tags = merge(local.standard_tags, { "name" = "${var.app_name}-picks" })
}

########################################
# votes — PK pick_id, SK user_id, GSI by user_id
########################################
resource "aws_dynamodb_table" "votes" {
  name         = "${var.app_name}-votes"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pick_id"
  range_key    = "user_id"

  attribute {
    name = "pick_id"
    type = "S"
  }
  attribute {
    name = "user_id"
    type = "S"
  }

  global_secondary_index {
    name            = "user-index"
    hash_key        = "user_id"
    range_key       = "pick_id"
    projection_type = "ALL"
  }

  point_in_time_recovery { enabled = true }

  tags = merge(local.standard_tags, { "name" = "${var.app_name}-votes" })
}

########################################
# poll_runs — PK id, GSI by type+ran_at (for "latest run" query)
########################################
resource "aws_dynamodb_table" "poll_runs" {
  name         = "${var.app_name}-poll-runs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
  attribute {
    name = "type"
    type = "S"
  }
  attribute {
    name = "ran_at"
    type = "S"
  }

  global_secondary_index {
    name            = "type-index"
    hash_key        = "type"
    range_key       = "ran_at"
    projection_type = "ALL"
  }

  tags = merge(local.standard_tags, { "name" = "${var.app_name}-poll-runs" })
}
