# Handoff Report: Email Parser Upgrade

**Summary:** The strategy requires removing the early DB deduplication commit to fix state inconsistency, adding a synthetic ID generator for missing Message-IDs, and splitting the IMAP fetch into a header-only fetch for deduplication checks before downloading the full body.

## 1. Observation
- File: `backend/app/services/email_lead_agent.py`
- In `process_lead_email`, lines 249-256 contain the early DB update for `processed_message_ids` before the Gemini API call.
- In `check_lead_emails`, line 464 uses `res, msg_data = mail.fetch(e_id, "(BODY.PEEK[])")` to fetch the full body for all UNSEEN emails without first checking deduplication.
- In `check_lead_emails`, line 475 extracts `msg_id = msg.get("Message-ID", None)`, but there is no fallback if it is missing, leading to `None` being passed down, which causes infinite loop fetching if it remains UNSEEN.

## 2. Logic Chain
1. **State Inconsistency (Lost Leads)**: The early database update of `processed_message_ids` on line 252 commits the message ID before processing completes. If Gemini fails (line 317-319), the function returns without updating the conversation state. Consequently, the email remains UNSEEN and is picked up on the next IMAP poll. However, the early DB commit means the deduplication check will falsely flag it as processed, and the lead is permanently ignored. To fix this, the early DB update must be removed. The in-memory append to `collected_data["processed_message_ids"]` should be moved to the end of the function, right before the final `supabase.table(...).update()` calls (lines 403 and 420), ensuring atomicity.
2. **Infinite Loop (Missing Message-ID)**: If an email lacks a `Message-ID` header, the deduplication fails. The email remains UNSEEN but is never deduplicated properly, causing it to be processed repeatedly. A synthetic ID must be generated. We can generate it by hashing the sender email, subject, and date headers, e.g., `<synthetic-HASH@local>`, providing a reliable fallback.
3. **Bandwidth Exhaustion**: Fetching `(BODY.PEEK[])` downloads the entire body and attachments for every UNSEEN email. We should first fetch `(BODY.PEEK[HEADER])`, parse the headers to obtain the sender and `Message-ID` (or generate the synthetic one). Then, we synchronously query Supabase to see if this `Message-ID` exists in the `processed_message_ids` for this sender. If it does, we explicitly mark the email as seen using `mail.store(e_id, '+FLAGS', '\\Seen')` and `continue`. This decouples IMAP state from processing state: after a successful processing loop, the database is updated. On the next 60s IMAP poll, the script will fetch headers, see the message in the DB, and mark it SEEN without fetching its body. If it's a truly new message, we proceed to fetch `(BODY.PEEK[])`.

## 3. Caveats
- Using the next polling cycle to mark successfully processed emails as `\\Seen` means there is a brief window (up to 60 seconds) where the email remains UNSEEN on the IMAP server after processing. This is acceptable since the script runs sequentially and the deduplication check on the headers will prevent double processing.
- The Supabase client is synchronous, so querying it for every UNSEEN email's header adds a small latency (one HTTP request per UNSEEN email). Given typical lead volume, this is well within acceptable limits.
- Sending a response email to a client that didn't provide a `Message-ID` might break threading in their email client since we will use the synthetic ID in `In-Reply-To`. This is standard behavior as we cannot invent a valid original ID for their client.

## 4. Conclusion
The updated strategy requires targeted changes to `backend/app/services/email_lead_agent.py`:
1. Remove lines 249-256 in `process_lead_email` and move the appending of `original_msg_id` to `processed_message_ids` to occur immediately before the state update `supabase.table("email_lead_conversations").update(...)` at the end of the function (both the `is_completed` and `else` blocks).
2. Update `check_lead_emails` to first fetch headers `(BODY.PEEK[HEADER])`, parse the `Message-ID` (creating a synthetic ID using `hashlib.md5(f"{sender_email}{subject}{date}".encode()).hexdigest()` if missing).
3. Add a deduplication check in `check_lead_emails` against Supabase using the `Message-ID`. If processed, call `mail.store(e_id, '+FLAGS', '\\Seen')` and skip. Also mark skipped/unparseable and paused emails as SEEN to prevent infinite header fetching.
4. Only fetch `(BODY.PEEK[])` and spawn the async task if the deduplication check passes (i.e., message is new).

## 5. Verification Method
1. Send an email with a large attachment and no `Message-ID` to the test inbox.
2. Force Gemini API failure (e.g., set an invalid API key or mock error).
3. Wait for one polling cycle. The script should fetch headers, fetch the body, attempt processing, and fail.
4. Wait for the next cycle. The script should RE-FETCH the body and attempt again because the DB wasn't updated (State Inconsistency solved).
5. Restore the API key. Wait for the next cycle. The script should process it successfully and reply.
6. Wait for the next cycle. The script should fetch headers ONLY, see it's processed, mark it `\\Seen` without fetching the body, and not process it again (Bandwidth and Infinite Loop solved).
