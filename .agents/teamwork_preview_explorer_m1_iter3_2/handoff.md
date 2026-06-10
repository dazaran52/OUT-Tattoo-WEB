# Handoff Report: Milestone 1 Iteration 3 Strategy

## 1. Observation
- `backend/app/services/email_lead_agent.py` line 445 uses `mail.search(None, "UNSEEN")` which returns unstable sequence numbers, making it difficult to maintain an in-memory cache of already seen emails.
- Lines 488-500 query Supabase (`select("is_paused, collected_data")`) for every unseen email and skip the email if `is_paused` is true, without checking the `state` of the conversation (which bans users even if the paused conversation was already `completed`).
- Lines 476-478 generate a synthetic ID formatted as `f"synthetic-{hash}"`, lacking brackets and a domain.
- Lines 558-561 dispatch the email processing concurrently using `asyncio.run_coroutine_threadsafe(..., loop)` without awaiting the result, causing race conditions in Supabase when a user sends multiple emails quickly.

## 2. Logic Chain
- **DB Exhaustion**: By introducing a global `seen_uids = set()` and switching to `mail.uid('SEARCH', None, "UNSEEN")`, we obtain stable Unique IDs. We can check this set instantly. If the UID is not in the set, we add it and proceed; if it is, we skip. This eliminates O(N) DB queries per minute.
- **Sequential Processing**: By capturing the returned future from `run_coroutine_threadsafe` and calling `.result()` on it, the thread will block until the email finishes processing. Since `check_lead_emails` runs in a threadpool executor, blocking it is safe and ensures sequential processing of the user's emails.
- **Paused State Cross-Contamination**: By fetching the `state` column in the Supabase query (`select("is_paused, collected_data, state")`), we can restrict the `is_paused` check to only apply if `row.get("state") in ["initiated", "active"]`.
- **RFC 2822 Violation**: Updating the synthetic ID creation to `msg_id = f"<{hashlib.sha256(unique_str.encode('utf-8')).hexdigest()}@synthetic.outtattoo>"` will comply with the standard and prevent breaking SMTP headers.

## 3. Caveats
- The `seen_uids` set is stored in memory and will be cleared on server restart. This is acceptable; upon restart, the script will query Supabase for any still-UNSEEN emails, correctly skip already-processed ones, and repopulate the set.
- Calling `future.result()` will block the thread, meaning a slow Gemini API response for one email will delay processing of subsequent emails in that polling tick. This is an intended trade-off to eliminate state corruption.

## 4. Conclusion
The Implementer should modify `backend/app/services/email_lead_agent.py` to:
1. Define a global `seen_uids = set()` at the top of the file.
2. Replace `mail.search(None, "UNSEEN")` with `mail.uid('SEARCH', None, "UNSEEN")`. Iterate over the returned `email_ids` (which are now UIDs), skip if they are in `seen_uids`, and otherwise add them to the set.
3. Replace subsequent `mail.fetch(e_id, ...)` calls with `mail.uid('FETCH', e_uid, ...)`.
4. Update the Supabase `select` to fetch `state`, and wrap the `is_paused` check in `if row.get("state") in ["initiated", "active"] and row.get("is_paused"):`.
5. Update the synthetic ID to `f"<{hashlib.sha256(unique_str.encode('utf-8')).hexdigest()}@synthetic.outtattoo>"`.
6. Add `.result()` to the `asyncio.run_coroutine_threadsafe` call to ensure processing is sequential.

## 5. Verification Method
- Manually inspect `email_lead_agent.py` to confirm all 4 fixes are present.
- Start the backend and verify it connects to IMAP successfully.
- Send a batch of test emails simultaneously to ensure they are processed sequentially without database race conditions or overwrites.
- Pause a completed conversation in the DB and verify that a new email from the same user is still processed correctly.
