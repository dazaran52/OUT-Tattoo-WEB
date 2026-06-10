# Scope: E2E Test Phase 1

## Architecture
- Sequentially execute Tier 1 to 4 tests.
- Tiers are F1-F6 Feature set across 4 tiers.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Tier 1 | Execute and pass all Tier 1 tests | none | PLANNED |
| 2 | Tier 2 | Execute and pass all Tier 2 tests | Tier 1 | PLANNED |
| 3 | Tier 3 | Execute and pass all Tier 3 tests | Tier 2 | PLANNED |
| 4 | Tier 4 | Execute and pass all Tier 4 tests | Tier 3 | PLANNED |

## Interface Contracts
- Tests must pass with `pytest tests/e2e/` (optionally filtered by tier via marker or path).
