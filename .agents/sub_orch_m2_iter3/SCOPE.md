# Scope: Milestone 2: Backend Pause Logic (Iteration 3)

## Architecture
- `backend/app/services/email_lead_agent.py`: `check_lead_emails` function

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Backend Pause Logic Fixes | Fix the 4 bugs from M2 Iteration 2: 1. Synthetic Hash fallback for msg_id. 2. Cache query for `is_paused` to avoid O(N). 3. Early commit of `processed_message_ids`. 4. Race condition unpausing (save msg_id if skipped due to pause). | none | PLANNED |

## Interface Contracts
- None new.
