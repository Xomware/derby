variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "parent_domain" {
  description = "Parent domain hosting the derby subdomain"
  type        = string
  default     = "xoware.com"
}

variable "subdomain" {
  description = "Web subdomain (creates web app DNS for <subdomain>.<parent_domain>)"
  type        = string
  default     = "derby"
}

variable "api_subdomain" {
  description = "API subdomain (creates DNS for <api_subdomain>.<parent_domain>)"
  type        = string
  default     = "api.derby"
}

variable "vercel_cname_target" {
  description = "Vercel CNAME target for the web app. Get this from Vercel project domain settings."
  type        = string
  default     = "cname.vercel-dns.com"
}

variable "api_cname_target" {
  description = "Backend host CNAME target. Set to your Railway or Fly.io public hostname."
  type        = string
  # Example Railway: "derby-api-production.up.railway.app"
  # Example Fly:     "derby-api.fly.dev"
}

# --- Resend (email) ---

variable "resend_send_subdomain" {
  description = "Subdomain Resend uses for SPF/MX records (typically 'send')"
  type        = string
  default     = "send.derby"
}

variable "resend_dkim_record_name" {
  description = "DKIM record name from the Resend dashboard (e.g. 'resend._domainkey.derby')"
  type        = string
}

variable "resend_dkim_record_value" {
  description = "DKIM TXT value from the Resend dashboard"
  type        = string
  sensitive   = true
}

variable "resend_smtp_mx_target" {
  description = "Resend MX target for the send subdomain (e.g. 'feedback-smtp.us-east-1.amazonses.com')"
  type        = string
  default     = "feedback-smtp.us-east-1.amazonses.com"
}

variable "resend_spf_value" {
  description = "SPF TXT for the send subdomain"
  type        = string
  default     = "v=spf1 include:amazonses.com ~all"
}

variable "enable_dmarc" {
  description = "Add a basic DMARC record at _dmarc.<derby_subdomain>"
  type        = bool
  default     = true
}
