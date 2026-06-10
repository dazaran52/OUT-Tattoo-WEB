## Review Summary

**Verdict**: REQUEST_CHANGES

## Findings

### [Critical] Finding 1: Premature message tracking causes permanent data loss on transient errors
- What: `original_msg_id` is added to `processed_message_ids` and saved to Supabase BEFORE processing is complete.
- Where: `backend/app/services/email_lead_agent.py`, lines 249-257.
- Why: If the `call_gemini_api()` fails (e.g., rate limit, timeout) at line 317, the function returns early and no reply is sent. However, because the message ID was already marked as processed in the database, subsequent polling loops will skip the email entirely. This results in the lead being permanently lost/stalled with no retry mechanism.
- Suggestion: Move the database update for `processed_message_ids` to the end of the process, ensuring it only saves after successfully sending the SMTP reply or completing the lead creation.

### [Major] Finding 2: Severe resource drain from unoptimized `BODY.PEEK[]` fetching
- What: The polling loop fetches the entire message payload (including heavy attachments) for every `UNSEEN` email before filtering.
- Where: `backend/app/services/email_lead_agent.py`, lines 466-489.
- Why: The system searches for `UNSEEN` messages and immediately calls `mail.fetch(e_id, "(BODY.PEEK[])")` to download the full content. Since emails from paused conversations or already-processed conversations remain `UNSEEN` on the IMAP server forever, the system downloads their full bodies (including images) every 60 seconds. As the inbox grows, this will cause massive bandwidth usage, memory exhaustion, and likely IMAP rate limit bans.
- Suggestion: Fetch only headers first to extract the `Message-ID` and `From` address (e.g., `mail.fetch(e_id, "(BODY.PEEK[HEADER.FIELDS (Message-ID From)])")`). Filter against `paused_emails` and `processed_message_ids` *before* fetching the full `BODY.PEEK[]`.

### [Minor] Finding 3: Attachment filename collisions
- What: Uploading attachments to Supabase Storage can fail if the same filename is reused.
- Where: `backend/app/services/email_lead_agent.py`, line 47.
- Why: The system uploads to `emails/{conversation_id}/{safe_filename}`. If a user sends multiple images named `image.png` or `photo.jpg` across different emails in the thread, the upload will conflict and fail because Supabase storage throws an error on duplicate names by default (unless `upsert` is true).
- Suggestion: Prepend a timestamp or UUID to `safe_filename` to ensure uniqueness.

## Verified Claims

- R1 (Update UNSEEN logic): Implemented via `BODY.PEEK[]`, but introduces major polling flaws. → FAIL
- R2 (Gemini prompt extraction): Implemented correctly with updated system prompt and JSON schema payload. → PASS
- R3 (Price calculation): Dynamic pricing logic implemented correctly based on CZK, EUR, PLN thresholds. → PASS
- R4 (IMAP sent append): Implemented correctly, appending raw SMTP bytes to the "Sent" folder. → PASS

## Coverage Gaps

- No significant coverage gaps in the file review, but the architectural flaw in R1 needs an immediate fix to prevent production outages.

## Unverified Items

- Supabase table constraints and actual `call_gemini_api` network behavior (reviewed statically via code analysis).
