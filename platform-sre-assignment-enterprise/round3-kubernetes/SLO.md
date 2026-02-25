
# Service Level Objectives (Detailed)

Availability: 99.9% monthly
Error Budget: 0.1%

Example:
If 1,000,000 requests/month
Allowed failures = 1000

Burn Alerts:
- Fast burn: 10% budget in 1h
- Slow burn: 50% budget in 7d
- High latency: p99 > 500ms for 5m
- Traffic anomaly detection enabled
