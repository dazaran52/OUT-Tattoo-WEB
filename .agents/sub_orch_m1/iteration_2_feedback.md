# Iteration 2 Review Feedback
The Iteration 2 implementation successfully addressed the previous flaws but introduced new architectural issues. The Reviewers VETOED the changes for the following reasons:

1. **DB Exhaustion & Rate Limits**: Fetching headers for every UNSEEN email on every 60s tick and querying Supabase for *each one* causes O(N) DB queries per minute.
   *Fix*: Maintain an in-memory `seen_uids = set()` in the script's global scope. On each tick, `search` UNSEEN. If an email's `e_id` (or UID) is in `seen_uids`, skip it instantly without fetching headers or querying the DB. If it's not in `seen_uids`, fetch headers, query DB, and add it to `seen_uids`.
2. **Race Condition (State Loss)**: Concurrent processing of multiple emails from the same user reads `collected_data`, waits for Gemini, and then overwrites it. The second update erases the first's `processed_message_ids`, leading to infinite loops for the erased ID.
   *Fix*: Process emails sequentially in the `check_lead_emails` loop instead of `asyncio.run_coroutine_threadsafe` concurrently, OR ensure that `process_lead_email` runs sequentially. A sequential loop is easiest and safest.
3. **Paused State Cross-Contamination**: The DB query in `check_lead_emails` retrieves *all* past conversations to check `is_paused`. If an old, completed conversation was paused, it bans the user forever.
   *Fix*: Only check `is_paused` for conversations where `status` is `active` or `initiated`.
4. **RFC 2822 Violation**: The synthetic Message-ID lacks `< >` brackets and an `@` domain. 
   *Fix*: Format the synthetic ID as `<{hash_hex}@synthetic.outtattoo>` so it doesn't break SMTP headers.
