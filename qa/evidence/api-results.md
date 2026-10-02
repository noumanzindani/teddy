# API test results — 2026-09-25T00:44:28.076Z

**1 tests: 0 passed, 1 failed, 0 blocked**

| ID | Area | Expected behaviour | Source | Result | Detail |
|---|---|---|---|---|---|
| SE-22 | security | Client cannot mark another client's payment as paid via /payments/confirm | security: IDOR (payment.controller confirm has no ownership check) | FAIL | qa2 confirmed sophia's intent: HTTP 200, payment now CAPTURED |
