# Scope: Milestone 1 and 2

## Architecture
- Email processing using IMAP and SMTP via `email_lead_agent.py`.
- Supabase for storing conversations and leads.
- Gemini API for parsing email intents.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Bug Fixes | Fix remaining bugs in email_lead_agent.py | none | PLANNED |

## Interface Contracts
### email_lead_agent ↔ Supabase
- `email_lead_conversations` table stores `processed_message_ids` in `collected_data`.
- `is_paused` boolean in `email_lead_conversations` to support manual interception.
