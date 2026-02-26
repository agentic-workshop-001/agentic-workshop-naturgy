# ── ALB Security Group ────────────────────────────────────────────────────────
# Inline rules are kept to non-cross-referencing rules only.
# The egress rule that points to the ECS tasks SG is added via
# aws_security_group_rule (see bottom of file) to break the circular dependency.

resource "aws_security_group" "alb" {
  name        = "${var.app_name}-${var.environment}-alb-sg"
  description = "Allow inbound HTTP from anywhere; allow outbound to ECS tasks on app port"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.app_name}-${var.environment}-alb-sg"
  })
}

# Added as a separate rule to break the circular SG reference (alb ↔ ecs_tasks).
resource "aws_security_group_rule" "alb_egress_to_ecs" {
  type                     = "egress"
  description              = "To ECS tasks on app port"
  from_port                = var.app_port
  to_port                  = var.app_port
  protocol                 = "tcp"
  security_group_id        = aws_security_group.alb.id
  source_security_group_id = aws_security_group.ecs_tasks.id
}

# ── Application Load Balancer ─────────────────────────────────────────────────

resource "aws_lb" "app" {
  name               = "${var.app_name}-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  tags = local.common_tags
}

# ── Target Group ──────────────────────────────────────────────────────────────

resource "aws_lb_target_group" "app" {
  name        = "${var.app_name}-${var.environment}"
  port        = var.app_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/api/gas/supply-points"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = local.common_tags
}

# ── HTTP Listener ─────────────────────────────────────────────────────────────

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }

  tags = local.common_tags
}
