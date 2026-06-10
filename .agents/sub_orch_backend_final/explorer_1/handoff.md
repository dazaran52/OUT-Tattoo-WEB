# Handoff Report: Email Lead Agent Verification & Bug Fixes

**Summary:** 
Investigated `backend/app/services/email_lead_agent.py`. The core logic (UNSEEN, Gemini, pricing, IMAP) is implemented correctly. Analyzed the 4 bugs and defined a clear, actionable fix strategy for the implementer.

## 1. Observation
- **UNSEEN logic**: `check_lead_emails` uses `mail.uid('SEARCH', None, "UNSEEN")` (line 447) and fetches using `(BODY.PEEK[])` (line 513). Tracks `seen_uids` in memory to avoid duplicate processing in the same loop without marking them as seen on the IMAP server.
- **Gemini extraction**: Uses `responseSchema` (line 90) and successfully parses `application/json` output (line 134).
- **Price calc**: Converts EUR (x25) and PLN (x5) to CZK equivalents, applying 5% if > threshold and 10% if <= threshold (lines 336-354).
- **IMAP append**: Uses `imaplib.append("Sent", '\\Seen', ...)` to properly store SMTP replies (lines 172-177).
- **Bug (a) - Synthetic Hash fallback**: Implemented at line 481 (`hashlib.sha256(unique_str.encode('utf-8')).hexdigest()`).
- **Bug (b) - `is_paused` O(N) Cache**: Currently, line 493 executes `supabase.table(...).eq("client_email", sender_email).execute()` inside the `for e_uid in email_uids:` loop, causing an O(N) query bottleneck.
- **Bug (c) - Early commit**: `processed_message_ids` is correctly appended and committed at lines 396-403 and lines 417-424, which is *after* the `send_smtp_reply` execution.
- **Bug (d) - Race condition unpausing**: At lines 496-506, if a conversation is paused, it skips the email (`continue`) but does not update `processed_message_ids`. If unpaused later, the agent will process these old emails.

## 2. Logic Chain
- The core logic implementations (UNSEEN, Gemini, Price Calc, IMAP append) are mathematically and architecturally sound and require no changes.
- **Bug (a)** is verified as fully implemented.
- **Bug (b)** causes performance degradation because it hits the Supabase API sequentially for every unread email. To fix this, we must fetch all active/initiated conversations in a single O(1) query before the loop and use a local dictionary cache.
- **Bug (c)** is already mostly handled correctly because the Supabase `.update()` happens at the very end of `process_lead_email`. No major restructuring needed, just verify the implementer leaves this order intact (and optionally checks the `sent` bool in the completed branch).
- **Bug (d)** directly causes the race condition: skipping an email without recording its ID means the system treats it as "new" once `is_paused` becomes false. Updating the DB when skipping fixes this.

## 3. Caveats
- `seen_uids` is an in-memory set that grows indefinitely until the container restarts. This is acceptable for now but could be a minor memory leak over months of uptime.
- In the completed branch (line 394), SMTP reply failures don't halt the DB update. This is acceptable because saving the lead is more critical than the confirmation email, but it's worth noting.

## 4. Conclusion & Recommended Fix Strategy
The implementer should apply the following changes to `backend/app/services/email_lead_agent.py`:

1. **Fix (b) - Implement Pre-loop Cache**:
   - Before `for e_uid in email_uids:`, add a single query:
     `active_convs_resp = supabase.table("email_lead_conversations").select("id, client_email, is_paused, collected_data, state").in_("state", ["initiated", "active"]).execute()`
   - Map this to a dictionary: `active_convs_cache = {row["client_email"]: row for row in active_convs_resp.data}`.
   - Replace the in-loop Supabase query (lines 492-508) with a lookup in `active_convs_cache`.

2. **Fix (d) - Prevent Unpause Race Condition**:
   - Inside the loop, if an email is skipped because it's found in the cache with `is_paused == True`, append `msg_id` to that conversation's `processed_message_ids`.
   - Immediately execute a Supabase `.update()` for that specific `conversation_id` to save the new `processed_message_ids` array, preventing it from ever being processed.

3. **Verify (a) & (c)**:
   - Leave the synthetic hash logic (lines 481-486) as is.
   - Leave the commit order in `process_lead_email` as is, ensuring it always happens strictly after `send_smtp_reply`.

## 5. Verification Method
- **Code Inspection**: Verify `supabase.table` `.select()` is moved outside the `e_uid` loop.
- **Code Inspection**: Verify that skipping a paused email triggers a `supabase.table(...).update(...)` adding `msg_id` to `processed_message_ids`.
- **Testing**: No test suite provided. Manual verification: send an email to a paused conversation, check the Supabase DB to ensure its ID is added to `processed_message_ids`. Unpause the conversation and verify the old email is ignored by the agent.
