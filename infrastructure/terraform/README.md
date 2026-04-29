# Derby — Infrastructure

Terraform stack for `derby.xomware.com`. Mirrors the conventions used in
`xomify-infrastructure`, `meals-infrastructure`, etc.

## What it provisions

| Resource                       | Notes                                                 |
| ------------------------------ | ----------------------------------------------------- |
| Web hosting (S3 + CloudFront)  | Shared module `domgiordano/web-hosting@v1.1.0`       |
| API Gateway + custom domain    | Shared module `domgiordano/api-gateway-service@v2.3.0`|
| ACM cert (us-east-1, regional) | DNS-validated via Route53                             |
| DynamoDB                       | 5 tables, PAY_PER_REQUEST, PITR on (most)             |
| Lambda functions               | Authorizer + ~17 handlers (stub on first apply)       |
| Lambda layer                   | `derby-shared-packages` (stub; deploy workflow fills) |
| EventBridge schedule           | Race-day poll trigger (disabled until `poll_enabled=true`)|
| SES domain identity            | `derby.xomware.com` with DKIM, SPF, MX, DMARC         |
| KMS key                        | S3 bucket encryption                                  |
| WAF                            | Consumes shared ACLs from `xomware-infrastructure`    |
| SSM parameters                 | JWT secret, API ID, invoke URL                        |

## Apply order

1. `cp terraform.tfvars.example terraform.tfvars`
2. `terraform init`
3. `terraform plan`
4. `terraform apply`

Initial apply will leave Lambda code as the stub from `templates/lambda_stub.zip`.
The `deploy-backend.yml` GitHub Actions workflow uploads real code on push.

## State

Stored in the shared `xomware-terraform-state` S3 bucket under
`derby/terraform.tfstate`. Lock table: `xomware-terraform-locks`.

## What's still TODO

- Real `churchill_downs` poll provider (Day 1 task — verify scrape source).
- SES production access (SES starts in sandbox; request prod access in console
  before May 2 so unverified recipient emails work).
