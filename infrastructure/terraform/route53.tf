data "aws_route53_zone" "parent" {
  name         = var.parent_domain
  private_zone = false
}

# --- Web app: derby.xoware.com -> Vercel ---

resource "aws_route53_record" "web" {
  zone_id = data.aws_route53_zone.parent.zone_id
  name    = local.fqdn_web
  type    = "CNAME"
  ttl     = 300
  records = [var.vercel_cname_target]
}

# --- API: api.derby.xoware.com -> Railway/Fly ---

resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.parent.zone_id
  name    = local.fqdn_api
  type    = "CNAME"
  ttl     = 300
  records = [var.api_cname_target]
}

# --- Resend (email) ---

resource "aws_route53_record" "resend_mx" {
  zone_id = data.aws_route53_zone.parent.zone_id
  name    = local.fqdn_send
  type    = "MX"
  ttl     = 300
  records = ["10 ${var.resend_smtp_mx_target}"]
}

resource "aws_route53_record" "resend_spf" {
  zone_id = data.aws_route53_zone.parent.zone_id
  name    = local.fqdn_send
  type    = "TXT"
  ttl     = 300
  records = [var.resend_spf_value]
}

resource "aws_route53_record" "resend_dkim" {
  zone_id = data.aws_route53_zone.parent.zone_id
  name    = "${var.resend_dkim_record_name}.${var.parent_domain}"
  type    = "TXT"
  ttl     = 300
  records = [var.resend_dkim_record_value]
}

resource "aws_route53_record" "dmarc" {
  count   = var.enable_dmarc ? 1 : 0
  zone_id = data.aws_route53_zone.parent.zone_id
  name    = local.fqdn_dmarc
  type    = "TXT"
  ttl     = 300
  records = ["v=DMARC1; p=none; rua=mailto:postmaster@${var.parent_domain}"]
}

output "web_fqdn" { value = local.fqdn_web }
output "api_fqdn" { value = local.fqdn_api }
output "send_fqdn" { value = local.fqdn_send }
