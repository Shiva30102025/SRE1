
# Secure Deployment Design (FinTech Grade)

## CI/CD Security
- SAST (SonarQube)
- DAST (OWASP ZAP)
- Secrets scanning (TruffleHog)
- Container scanning (Trivy)
- SBOM generation (Syft)

## IAM
- IRSA for Kubernetes
- Least privilege per microservice

## mTLS
- Istio mesh with STRICT mode

## PCI-DSS Logging Schema
Fields:
- user_id
- transaction_id
- timestamp
- source_ip
- action
- status

## PMLA Audit Log
Immutable storage in S3 + Glacier

## Secrets Rotation
AWS Secrets Manager auto-rotation every 30 days
Zero-downtime reload supported
