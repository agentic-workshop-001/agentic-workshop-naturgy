data "aws_caller_identity" "current" {}

# ── ECS Task Execution Role ───────────────────────────────────────────────────

resource "aws_iam_role" "ecs_execution" {
  name        = "${var.app_name}-${var.environment}-ecs-execution-role"
  description = "Allows ECS to pull images from ECR and write logs to CloudWatch"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ecs_execution_policy" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ── ECS Task Role (least-privilege) ──────────────────────────────────────────

resource "aws_iam_role" "ecs_task" {
  name        = "${var.app_name}-${var.environment}-ecs-task-role"
  description = "Runtime permissions for the application container"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "ecs_task_logs" {
  name = "${var.app_name}-${var.environment}-ecs-task-logs"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      Resource = "${aws_cloudwatch_log_group.ecs.arn}:*"
    }]
  })
}
