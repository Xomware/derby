locals {
  fqdn_web   = "${var.subdomain}.${var.parent_domain}"
  fqdn_api   = "${var.api_subdomain}.${var.parent_domain}"
  fqdn_send  = "${var.resend_send_subdomain}.${var.parent_domain}"
  fqdn_dmarc = "_dmarc.${var.subdomain}.${var.parent_domain}"

  standard_tags = {
    "source"   = "terraform"
    "app_name" = "derby"
  }
}
