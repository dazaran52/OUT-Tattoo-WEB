## Review Summary

**Verdict**: REQUEST_CHANGES

The implementation addresses several of the requested features (Gemini schema enforcement, Message-ID handling, IMAP Sent append) but introduces severe architectural and logical flaws that fail to properly resolve the "bandwidth exhaustion" and "state inconsistency" issues. In fact, the new UNSEEN logic introduces a massive DB querying leak.

## Findings

### [Critical] DB Exhaustion and Infinite Retry Loop via Flawed UNSEEN Logic
- **Where**: `backend/app/services/email_lead_agent.py` inside `check_lead_emails` and `process_lead_email`
- **What**: The script searches for `UNSEEN` emails every 60 seconds. However, it intentionally uses `BODY.PEEK[]` and never marks processed or skipped emails as `\Seen`. 
- **Why this is a problem**: 
  1. **O(N) Database Queries**: Because emails remain UNSEEN, every 60 seconds the loop retrieves the headers of ALL historical unread emails and executes a Supabase query `conv_resp = supabase.table("email_lead_conversations")...` for EACH ONE to check if it should be skipped. If a mailbox has 10,000 old processed unread emails, it will perform 10,000 Supabase queries every minute, exhausting DB limits.
  2. **Infinite Gemini Loop**: If `call_gemini_api` fails (timeout, bad JSON), `process_lead_email` returns early WITHOUT adding the `msg_id` to `processed_message_ids`. Since the email is still UNSEEN, the bot will pick it up again 60 seconds later and hammer the Gemini API endlessly until it succeeds.
- **Suggestion**: Either explicitly mark emails as `\Seen` using `mail.store(e_id, '+FLAGS', '\\Seen')` after successful processing/skipping, OR if they must remain unread, use IMAP `UID SEARCH` with a stored high-water mark instead of blindly querying all `UNSEEN` messages. Ensure `processed_message_ids` is updated or a local retry-limit is enforced even if Gemini fails.

### [Critical] State Inconsistency via Read-Modify-Write Race Condition
- **Where**: `process_lead_email`
- **What**: The agent fetches the `conversation` containing `collected_data` from Supabase, awaits a long Gemini API call, and then overwrites the entire `collected_data` JSON column via `supabase.table("email_lead_conversations").update(...)`.
- **Why this is a problem**: Emails are processed concurrently via `asyncio.run_coroutine_threadsafe`. If a client sends two emails within a few seconds, both tasks will read the initial DB state, run Gemini, and the slower one will overwrite the faster one's state and history. This results in data loss.
- **Suggestion**: Use a more robust concurrency control method, or use PostgreSQL JSONB appending capabilities via an RPC, or process emails for the same conversation sequentially.

### [Major] Attachment Data Loss via Filename Collisions
- **Where**: `upload_attachment_to_supabase` and `process_lead_email`
- **What**: Images without filenames are assigned `f"image_{len(attachments)}.{ext}"`. The upload path is `emails/{conversation_id}/{safe_filename}`. Supabase `upload()` throws an exception if a file already exists at the target path (unless `upsert=True` is provided).
- **Why this is a problem**: If a client sends a second email in the same conversation with another inline image (which also gets named `image_0.jpeg`), the upload will fail, and the image will be silently dropped.
- **Suggestion**: Append a timestamp, a short UUID, or the message ID to the filename (e.g., `f"{msg_id}_image_{len(attachments)}.{ext}"`) to guarantee uniqueness within the conversation.

### [Minor] Brittle IMAP Host Inference
- **Where**: `send_smtp_reply`
- **What**: `imap_host = settings.LEAD_REPLY_SMTP_SERVER.replace("smtp", "imap")`
- **Why this is a problem**: While this works for standard providers like Gmail, it is a brittle assumption. It may fail for custom domains (e.g., `mail.custom.com` used for both SMTP and IMAP).
- **Suggestion**: Consider adding a separate `LEAD_REPLY_IMAP_SERVER` configuration variable.

## Verified Claims
- **Message-ID Handling**: Verified. Synthetic IDs are generated deterministically if `Message-ID` is missing.
- **IMAP Sent Append**: Verified. `bytes(msg)` and `Time2Internaldate` are used correctly to append to the Sent folder.
- **Gemini Schema Extraction**: Verified. Valid `responseSchema` is constructed, and missing fields (`null`) correctly avoid overwriting existing data.

## Unverified Items
- None. All logic paths related to the requested features were analyzed.
