# Derby — Terraform

Manages DNS records on the existing `xoware.com` Route53 zone for:

- `derby.xoware.com` → Vercel (web app)
- `api.derby.xoware.com` → Railway / Fly.io (FastAPI)
- `send.derby.xoware.com` MX + SPF, DKIM TXT, optional DMARC → Resend (email)

State lives in the existing `xomware-terraform-state` S3 bucket under `derby/terraform.tfstate`.

## Order of operations (Day 1)

1. **Create Vercel project** for `apps/web`. Add `derby.xoware.com` as a domain → Vercel gives you a CNAME target (default: `cname.vercel-dns.com`).
2. **Create Railway/Fly project** for `apps/api`. Add `api.derby.xoware.com` as a custom domain → copy the hostname.
3. **Create Resend account**. Add domain `derby.xoware.com`. Resend gives you DKIM record name + value, plus standard MX / SPF on `send.derby.xoware.com`.
4. Copy `terraform.tfvars.example` → `terraform.tfvars`, fill in the three placeholder values:
   - `api_cname_target`
   - `resend_dkim_record_name`
   - `resend_dkim_record_value`
5. Run:

```bash
terraform init
terraform plan
terraform apply
```

6. Verify:
   - `dig CNAME derby.xoware.com` → Vercel
   - `dig CNAME api.derby.xoware.com` → Railway/Fly
   - Click "Verify DNS" in Resend dashboard → status should flip to `Verified` within minutes.

## Variables that don't change

The MX target (`feedback-smtp.us-east-1.amazonses.com`) and SPF (`v=spf1 include:amazonses.com ~all`) are Resend defaults; only override if Resend tells you to.
