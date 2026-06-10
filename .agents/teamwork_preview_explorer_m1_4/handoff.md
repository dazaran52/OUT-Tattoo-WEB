# Handoff Report: Email Lead Agent Strategy

## 1. Observation
- **State Inconsistency**: In `backend/app/services/email_lead_agent.py`, `original_msg_id` is appended to `collected_data["processed_message_ids"]` and saved to Supabase at lines 249-256, *before* calling `call_gemini_api` (line 317). If Gemini fails, the process exits without replying, but the message is permanently marked as processed and the email is permanently dropped.
- **Infinite Loop**: If an email lacks a `Message-ID` header, `msg.get("Message-ID")` returns `None`. Line 249 checks `if original_msg_id:` and skips appending to `processed_message_ids`. The email remains `UNSEEN` and is re-fetched indefinitely on every 60-second poll.
- **Bandwidth Exhaustion**: At line 465, `mail.fetch(e_id, "(BODY.PEEK[])")` fetches the complete raw email (including attachments) for every `UNSEEN` message. Deduplication checks (`msg_id in processed_message_ids`) only occur deep inside `process_lead_email` after the bandwidth is already consumed.

## 2. Logic Chain
1. **Fixing Flaw 1 (State Inconsistency)**: We must delete lines 249-256 to prevent premature database writes. The logic `collected_data["processed_message_ids"].append(original_msg_id)` must be moved to immediately follow a successful `ai_response` return (e.g., around line 331), ensuring a message is only marked processed if Gemini successfully generates a response.
2. **Fixing Flaw 2 (Missing Message-ID)**: We need to import `hashlib`. During header parsing in `check_lead_emails`, if `msg.get("Message-ID")` is empty, we must generate a stable synthetic ID: `hashlib.md5(f"{sender_email}:{subject}:{msg.get('Date', '')}".encode()).hexdigest()`. Using `time.time()` as a fallback date would defeat deduplication because the ID would change on every poll, so an empty string fallback is required to keep the hash deterministic.
3. **Fixing Flaw 3 (Bandwidth Exhaustion)**: `check_lead_emails` must use a two-pass fetch approach:
   - Pass 1: `mail.fetch(e_id, "(BODY.PEEK[HEADER.FIELDS (MESSAGE-ID FROM SUBJECT DATE)])")` to retrieve minimal data.
   - Parse headers, generate `msg_id` if needed.
   - Perform a Supabase check on `email_lead_conversations` to verify if `msg_id` is already in the `processed_message_ids` array for this `sender_email`.
   - Pass 2: If the message is new (not in DB), perform `mail.fetch(e_id, "(BODY.PEEK[])")` to download the full body and attachments, and then dispatch to `process_lead_email`.

## 3. Caveats
- Adding a synchronous Supabase query inside the IMAP loop in `check_lead_emails` for each `UNSEEN` email could slightly increase processing time for large backlogs. However, since it runs in a ThreadPoolExecutor, it does not block the FastAPI event loop, and it saves massive amounts of memory and network I/O compared to fetching attachments.
- When generating synthetic IDs, do NOT use `time.time()` as a fallback for missing dates, as it will break idempotency. Rely on the raw string combinations of sender, subject, and available date.

## 4. Conclusion
The implementation of Milestone 1 should proceed by making targeted edits to `email_lead_agent.py`: importing `hashlib`, moving the `processed_message_ids` append operation to post-Gemini execution, modifying the initial IMAP fetch to `HEADER.FIELDS` only, injecting deterministic synthetic IDs, and fetching `BODY.PEEK[]` only for unverified messages.

## 5. Verification Method
1. Send an email with a 5MB attachment and a `Message-ID`. Verify the IMAP logs only fetch headers first, process it, and mark it in the DB.
2. Force a simulated Gemini failure (e.g., change the API key to invalid). Verify the message is *not* added to `processed_message_ids` and is retried on the next poll.
3. Send an email manually via a script omitting the `Message-ID` header. Verify a `synthetic-` ID is generated and the email is successfully processed exactly once.
