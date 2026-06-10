# Milestone 1: Email Lead Agent Analysis & Strategy (Iteration 3)

## 1. Observation
- **DB Exhaustion**: In `backend/app/services/email_lead_agent.py` at line 445, `status, messages = mail.search(None, "UNSEEN")` uses message sequence numbers instead of IMAP UIDs. For every unseen ID, it queries Supabase (line 488) on every 60s tick because the script uses `BODY.PEEK` and never marks them as seen on the server.
- **Race Condition (State Loss)**: At line 558, `asyncio.run_coroutine_threadsafe(process_lead_email(...))` executes processing concurrently. If one user sends multiple emails at once, they both read `collected_data` and overwrite each other, causing infinite loops.
- **Paused State Cross-Contamination**: At line 488, the `select("is_paused, collected_data")` query does not fetch `state`. Lines 491-494 check `if row.get("is_paused"): skip_email = True` unconditionally for all conversation rows, blocking users who have paused historical (completed) conversations.
- **RFC Violation**: At line 478, `msg_id = f"synthetic-{hashlib.sha256(unique_str.encode('utf-8')).hexdigest()}"` lacks `<>` brackets and an `@domain`, which breaks standard SMTP threading.

## 2. Logic Chain
1. **To fix DB Exhaustion**: Introduce a global `seen_uids = set()` at the top of the file. In `check_lead_emails`, use `mail.uid('SEARCH', None, "UNSEEN")` instead of `mail.search`. Iterate over UIDs; skip instantly if `uid in seen_uids`. Otherwise, fetch headers via `mail.uid('FETCH', uid, ...)`, query the DB, process the email, and add the `uid` to `seen_uids`. This prevents O(N) repeat DB queries on every tick.
2. **To fix Race Conditions**: Remove `asyncio.run_coroutine_threadsafe` and remove `loop` from `check_lead_emails`. Instead, `check_lead_emails` should collect and return a list of valid emails: `emails_to_process = [(sender_name, ...), ...]`. Then, in `start_email_lead_agent` (line 579), after awaiting the executor `await loop.run_in_executor(None, check_lead_emails)`, iterate over the returned list and `await process_lead_email(...)` sequentially.
3. **To fix Cross-Contamination**: Update the DB query at line 488 to `select("is_paused, collected_data, state")`. Update the pause logic at line 491 to `if row.get("state") in ["initiated", "active"] and row.get("is_paused"):`.
4. **To fix RFC Violation**: Format the synthetic ID at line 478 to include angle brackets and a domain: `msg_id = f"<{hash_hex}@synthetic.outtattoo>"`.

## 3. Caveats
- `seen_uids` is cleared on app restart. The first execution will query Supabase for all `UNSEEN` emails, potentially causing a burst of DB queries. This is acceptable per the feedback.
- Using `uid` strings (`uid_bytes.decode('utf-8')`) requires replacing both `SEARCH` and `FETCH` with their UID variants (`mail.uid('SEARCH', ...)` and `mail.uid('FETCH', ...)`).

## 4. Conclusion
The file `email_lead_agent.py` must be rewritten to process emails sequentially, use a global `seen_uids` set with `mail.uid()`, narrow the DB pause-check to active/initiated states, and correctly format synthetic message IDs. The implementation is straightforward and should be executed by the main implementer agent.

## 5. Verification Method
- `pytest` or equivalent tests for the E2E suite should pass (especially tiers checking for sequential processing, RFC compliance, and state isolation).
- Verify that `is_paused` checks only trigger for active/initiated conversations via manual inspection or logs.
- Verify `seen_uids` populates correctly and subsequent 60s ticks output no logs about checking already processed messages.
- Verify new synthetic IDs follow the `<hash@synthetic.outtattoo>` format.
