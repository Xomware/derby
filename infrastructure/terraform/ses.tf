resource "aws_ses_domain_identity" "derby" {
  domain = local.domain_name
}

resource "aws_ses_email_identity" "noreply" {
  email = var.from_email
}

resource "aws_ses_domain_dkim" "derby" {
  domain = aws_ses_domain_identity.derby.domain
}

resource "aws_route53_record" "ses_verification" {
  zone_id = data.aws_route53_zone.web_zone.zone_id
  name    = "_amazonses.${local.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = [aws_ses_domain_identity.derby.verification_token]
}

resource "aws_route53_record" "ses_dkim" {
  count   = 3
  zone_id = data.aws_route53_zone.web_zone.zone_id
  name    = "${aws_ses_domain_dkim.derby.dkim_tokens[count.index]}._domainkey.${local.domain_name}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.derby.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

resource "aws_ses_domain_identity_verification" "derby" {
  domain     = aws_ses_domain_identity.derby.id
  depends_on = [aws_route53_record.ses_verification]
}

resource "aws_ses_domain_mail_from" "derby" {
  domain           = aws_ses_domain_identity.derby.domain
  mail_from_domain = "mail.${local.domain_name}"
}

resource "aws_route53_record" "ses_mail_from_mx" {
  zone_id = data.aws_route53_zone.web_zone.zone_id
  name    = "mail.${local.domain_name}"
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.${var.aws_region}.amazonses.com"]
}

resource "aws_route53_record" "ses_mail_from_spf" {
  zone_id = data.aws_route53_zone.web_zone.zone_id
  name    = "mail.${local.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}

# Lightweight DMARC at the subdomain so SES emails align cleanly.
resource "aws_route53_record" "dmarc" {
  zone_id = data.aws_route53_zone.web_zone.zone_id
  name    = "_dmarc.${local.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = ["v=DMARC1; p=none; rua=mailto:postmaster@${var.route53_zone_name}"]
}
