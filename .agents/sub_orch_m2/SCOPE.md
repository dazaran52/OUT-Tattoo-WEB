# Scope: Backend Pause Logic

## Architecture
- `backend/app/services/email_lead_agent.py`: `check_lead_emails` function
- `backend/app/routers/admin.py`: new pause endpoint
- Supabase table `email_lead_conversations`: field `is_paused`

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Backend Pause Logic | Add `is_paused` field logic, update `check_lead_emails`, and add PUT endpoint. | none | IN_PROGRESS |

## Interface Contracts
### Admin API ↔ Frontend
- `PUT /api/admin/conversations/{id}/pause`
  - Body: JSON `{ "is_paused": boolean }`
  - Result: Updates `is_paused` flag in DB.
