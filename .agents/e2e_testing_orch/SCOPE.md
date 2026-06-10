# E2E Testing Scope: OUT Tattoo WEB

## Architecture
- `pytest` for backend API and integration.
- `playwright` for frontend UI.
- Mocking IMAP/SMTP server (or relying on mock interfaces).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Test Harness & Tier 1 | Setup pytest, playwright, mocks. Write Tier 1 (Feature Coverage) test cases. | none | PLANNED |
| 2 | Tier 2 | Write Tier 2 (Boundary & Corner Cases) test cases. | M1 | PLANNED |
| 3 | Tier 3 | Write Tier 3 (Cross-Feature Combinations) test cases. | M1 | PLANNED |
| 4 | Tier 4 | Write Tier 4 (Real-World Application Scenarios) test cases. | M1, M2, M3 | PLANNED |

## Interface Contracts
- Tests must pass via `pytest tests/e2e` when run against the backend and frontend.
