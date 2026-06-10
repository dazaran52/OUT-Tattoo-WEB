# Handoff Report: Email Parser Upgrade Fix Strategy

## 1. Observation
I reviewed the `backend/app/services/email_lead_agent.py` script alongside the Iteration 2 feedback.
- **DB Exhaustion**: Currently, `check_lead_emails` executes `mail.search(None, "UNSEEN")` on line 445 and queries Supabase (line 488) for *every* unseen email on *every* 60s tick.
- **Race Condition**: On line 558, `asyncio.run_coroutine_threadsafe(process_lead_email(...), loop)` is called, which processes multiple emails from the same sender simultaneously. Both executions read the `collected_data` JSON, fetch from Gemini, and overwrite the JSON, destroying state (like `processed_message_ids`).
- **Paused State Cross-Contamination**: On line 488, the DB query `select("is_paused, collected_data")` fetches all historical conversations for an email and bans them if *any* old conversation is `is_paused` (line 491). It ignores the `state` column.
- **RFC Violation**: On line 478, the fallback message ID is `msg_id = f"synthetic-{hashlib.sha256(unique_str.encode('utf-8')).hexdigest()}"`, which lacks standard RFC 2822 `< >` brackets and an `@domain`.

## 2. Logic Chain
1. To fix the DB exhaustion while preserving the Steath (UNSEEN) mechanic, we must track processed emails in memory. Using `UID`s instead of sequence numbers (e_ids) provides stable references. Adding a module-level `seen_uids = set()` ensures that after the first pass or on subsequent loops, already-seen emails are ignored instantly without triggering network or DB requests.
2. To fix the race condition, the `check_lead_emails` function should be changed from dispatching asynchronous threads to simply returning a list of parsed email dictionaries. Then, `start_email_lead_agent` can iterate through this list and `await process_lead_email(...)` sequentially. This guarantees that one email updates the Supabase DB completely before the next email is read.
3. To fix cross-contamination, the DB query for header filtering must include the `state` field, and the pause logic should only trigger if `row.get("state") in ["initiated", "active"]`. This mirrors the correct logic already present in `process_lead_email`.
4. To ensure SMTP compliance for the fallback IDs, the format must be updated to `<hash@synthetic.outtattoo>`.

## 3. Caveats
- Using an in-memory `set()` means that on service restart, all unseen emails will trigger one round of DB checks before repopulating the set. This is a one-time startup cost and is acceptable.
- Transitioning to `UID`s requires changing `mail.search` to `mail.uid('search')` and `mail.fetch` to `mail.uid('fetch')`.

## 4. Conclusion
The file `backend/app/services/email_lead_agent.py` must be refactored to implement the sequential pipeline and in-memory tracking. 
1. Add `seen_uids = set()` at the top.
2. Change `check_lead_emails` to use `mail.uid` and skip items in `seen_uids`. It should return a list of `emails_to_process`.
3. Update `start_email_lead_agent` to iterate over `emails_to_process` and `await` them sequentially.
4. Update the DB check in `check_lead_emails` to include the `state` column.
5. Format synthetic message IDs as `<{hash}@synthetic.outtattoo>`.

## 5. Verification Method
- **DB Rate limits**: Run the agent, print logs, and observe that "Found X new emails" doesn't result in X Supabase queries every 60 seconds after the first tick.
- **Race conditions**: Send 3 emails rapidly from the same address; observe that the bot processes them one by one, and `processed_message_ids` retains all 3 IDs.
- **RFC Valid**: Ensure that the `Message-ID` in the Supabase `thread_id` field contains brackets for emails lacking an ID.
