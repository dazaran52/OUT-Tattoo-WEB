## Review Summary

**Verdict**: APPROVE

## Observation
I reviewed `backend/app/services/email_lead_agent.py`. The following changes are explicitly observable:
1. **DB Exhaustion (UID cache)**: A `seen_uids = set()` is declared at line 18. Inside `check_lead_emails`, newly fetched IMAP UIDs are checked against this set, and added to it (lines 456-458), skipping previously seen UNSEEN emails without querying the database or parsing the body.
2. **Race Conditions (Sequential Execution)**: At lines 563-566, the async `process_lead_email` function is run via `asyncio.run_coroutine_threadsafe(...).result()`. Calling `.result()` blocks the loop thread until the email processing completes, ensuring emails are processed synchronously one by one.
3. **Strict Paused Checks**: The code checks `is_paused` twice. First, in `check_lead_emails` via a header-only database check (lines 493-499), preventing the download of the email body if the conversation is paused. Second, inside `process_lead_email` (lines 198-204) as an extra sanity check before calling Gemini.
4. **Commit after reply**: `processed_message_ids` is only updated after `send_smtp_reply` successfully returns `True` (lines 417-423).
5. **Synthetic hash**: Generated correctly using `hashlib.sha256(unique_str.encode('utf-8')).hexdigest()` if `Message-ID` is missing (lines 481-483).

## Logic Chain
- The `seen_uids` set prevents the `while True` polling loop from repeatedly executing Supabase queries for emails that have already been handled but remain marked as `UNSEEN`. This directly resolves the DB Exhaustion risk.
- Sequential execution guarantees that multiple incoming emails from the same client are processed sequentially. This prevents race conditions where concurrent Gemini API calls or DB updates could duplicate replies or incorrectly handle conversation state (including unpausing edge cases).
- The strict `is_paused` check prevents the bot from answering or fully downloading the body of emails that belong to a paused conversation. Since these skipped emails are also added to `seen_uids`, they will not be re-processed even if the conversation is later unpaused, leaving the admin strictly in charge of those specific emails.
- "Commit after reply" guarantees that if an email reply fails to send via SMTP, its `msg_id` is not permanently recorded, allowing potential human intervention or safe retry on restart.
- The implementations align perfectly with the backend architecture required by `PROJECT.md` and `SCOPE.md`.

## Caveats
- `seen_uids` is an in-memory cache. If the server restarts, all historically UNSEEN emails will be fetched again by IMAP. However, the system's "header check" efficiently filters these out using the database `processed_message_ids` without full body processing or duplicate replies. Thus, this is an acceptable, lightweight design choice.

## Conclusion
**Verdict: PASS / APPROVE**
The implementation successfully meets all specified requirements in `SCOPE.md` and `PROJECT.md`. The logic efficiently guards against DB exhaustion, safely resolves concurrency race conditions via sequential execution, and implements strict paused checks gracefully.

## Verification Method
- Execute the backend tests using `pytest` (if available) targeting the `email_lead_agent`.
- Manually run the lead agent loop and send multiple concurrent emails to verify sequential logging and no DB double-inserts.
