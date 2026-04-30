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
# race_results — PK event_id (S), SK race_number (N)
########################################
resource "aws_dynamodb_table" "race_results" {
  name         = "${var.app_name}-race-results"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "event_id"
  range_key    = "race_number"

  attribute {
    name = "event_id"
    type = "S"
  }
  attribute {
    name = "race_number"
    type = "N"
  }

  point_in_time_recovery { enabled = true }

  tags = merge(local.standard_tags, { "name" = "${var.app_name}-race-results" })
}

########################################
# visits — PK visit_id, GSI by user_id+ran_at, GSI by day-bucket
########################################
resource "aws_dynamodb_table" "visits" {
  name         = "${var.app_name}-visits"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "visit_id"

  attribute {
    name = "visit_id"
    type = "S"
  }
  attribute {
    name = "user_id"
    type = "S"
  }
  attribute {
    name = "day"
    type = "S"
  }
  attribute {
    name = "ts"
    type = "S"
  }

  global_secondary_index {
    name            = "user-index"
    hash_key        = "user_id"
    range_key       = "ts"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "day-index"
    hash_key        = "day"
    range_key       = "ts"
    projection_type = "ALL"
  }

  tags = merge(local.standard_tags, { "name" = "${var.app_name}-visits" })
}

########################################
# predictions — PK event_id, SK username (uppercase canonical)
########################################
resource "aws_dynamodb_table" "predictions" {
  name         = "${var.app_name}-predictions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "event_id"
  range_key    = "username"

  attribute {
    name = "event_id"
    type = "S"
  }
  attribute {
    name = "username"
    type = "S"
  }

  point_in_time_recovery { enabled = true }

  tags = merge(local.standard_tags, { "name" = "${var.app_name}-predictions" })
}

########################################
# comments — PK event_id, SK created_at#uuid (lexicographic chronological)
########################################
resource "aws_dynamodb_table" "comments" {
  name         = "${var.app_name}-comments"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "event_id"
  range_key    = "id"

  attribute {
    name = "event_id"
    type = "S"
  }
  attribute {
    name = "id"
    type = "S"
  }

  point_in_time_recovery { enabled = true }

  tags = merge(local.standard_tags, { "name" = "${var.app_name}-comments" })
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
