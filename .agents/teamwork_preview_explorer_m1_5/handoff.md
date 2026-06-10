# Handoff Report: Email Parser Upgrade (Milestone 1) Fix Strategy

**Summary**: The `email_lead_agent.py` script has three critical flaws related to IMAP fetching and deduplication. This report outlines the precise code changes needed to resolve state inconsistency, infinite loops, and bandwidth exhaustion without modifying the core AI functionality.

## 1. Observation
- **Flaw 1 (State Inconsistency)**: In `backend/app/services/email_lead_agent.py:249-256`, `original_msg_id` is appended to `collected_data["processed_message_ids"]` and saved to the Supabase database *before* the `call_gemini_api` invocation. If Gemini returns `None` (line 318), the function exits, but the message remains marked as processed in the database.
- **Flaw 2 (Infinite Loop)**: In `backend/app/services/email_lead_agent.py:475`, `msg_id = msg.get("Message-ID", None)`. If the header is missing, `msg_id` is `None`. Consequently, `original_msg_id` evaluates to `None` in `process_lead_email`, skipping deduplication logic. Because `BODY.PEEK` is used, the message remains `UNSEEN` and is continuously re-fetched.
- **Flaw 3 (Bandwidth Exhaustion)**: In `backend/app/services/email_lead_agent.py:465`, the IMAP loop uses `res, msg_data = mail.fetch(e_id, "(BODY.PEEK[])")` to download the entire message payload (including attachments) for *all* `UNSEEN` messages before parsing headers or checking deduplication status.

## 2. Logic Chain
1. **Fixing State Inconsistency**: To ensure leads are not lost when Gemini fails, the `processed_message_ids` update must be atomic with the final successful state save. The early save at lines 249-256 must be removed. Instead, `original_msg_id` should be appended to `collected_data["processed_message_ids"]` directly before the final `supabase.table(...).update(...)` calls at the end of the function (for both active and completed states).
2. **Fixing Infinite Loop**: When extracting headers, we must ensure `msg_id` is never `None`. If the `Message-ID` header is missing, we must generate a stable, deterministic synthetic ID based on available metadata (e.g., `hashlib.sha256(f"{sender_email}{subject}{date}".encode()).hexdigest()`). This ensures that on the next cycle, the generated ID will be identical and correctly match the `processed_message_ids` array.
3. **Fixing Bandwidth Exhaustion**: The IMAP fetch inside `check_lead_emails` must be split into two steps. First, fetch only the required headers using `(BODY.PEEK[HEADER.FIELDS (Message-ID From Subject Date)])`. Extract the sender, subject, date, and `msg_id` (generating a synthetic one if needed). Then, synchronously query Supabase for conversations matching `sender_email` to check if `msg_id` is in `processed_message_ids`. *Only if it is not processed* should the script issue a second fetch: `mail.fetch(e_id, "(BODY.PEEK[])")` to download the full body and dispatch `process_lead_email`.

## 3. Caveats
- If the `Date` header is missing along with the `Message-ID`, the synthetic hash will rely only on `From` and `Subject`. If a user sends multiple identical emails with no `Date` or `Message-ID`, they might be erroneously deduplicated. This is a highly unlikely edge case and vastly preferable to an infinite processing loop.
- Querying Supabase per `UNSEEN` message in the synchronous loop introduces a slight network delay. However, since the script only queries for new `UNSEEN` emails, the volume per 60-second tick is very low, making this overhead negligible.

## 4. Conclusion
To safely implement Milestone 1, the implementer must:
1. Remove the early `processed_message_ids` save in `process_lead_email` and move it to the final successful DB updates.
2. Update `check_lead_emails` to fetch `(BODY.PEEK[HEADER.FIELDS (Message-ID From Subject Date)])` first.
3. Parse the headers to generate a fallback synthetic `Message-ID` if necessary.
4. Query the database to check for deduplication before calling `mail.fetch(e_id, "(BODY.PEEK[])")` and dispatching the processor.

## 5. Verification Method
- **Unit/Integration Test**: Send an email without a `Message-ID` header and verify in logs that a synthetic ID is created and the email is only processed once.
- **Error Injection Test**: Temporarily modify `call_gemini_api` to return `None`. Send an email. Verify that it is NOT added to `processed_message_ids` and is retried on the next 60s IMAP tick.
- **Log Inspection**: Verify the application logs show `FETCH (BODY.PEEK[HEADER.FIELDS ...])` occurring before any `FETCH (BODY.PEEK[])` calls.
