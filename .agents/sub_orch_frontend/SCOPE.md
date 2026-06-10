# Scope: Frontend UI

## Architecture
- React frontend components

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | AdminAiChats updates | Add `client_country_code` tag, country filter, "Intercept dialog" button -> `PUT /api/admin/conversations/{id}/pause` in `frontend/src/components/AdminAiChats.tsx` | none | DONE |

## Interface Contracts
### Frontend ↔ Backend
- `PUT /api/admin/conversations/{id}/pause` (sets `is_paused` flag)
- Conversation object includes `client_country_code` and `is_paused`

## Code Layout
- Frontend app: `frontend/`
- Component: `frontend/src/components/AdminAiChats.tsx`
