# Handoff Report

## 1. Observation
- In `backend/app/services/email_lead_agent.py`, the `check_lead_emails` function retrieves UNSEEN emails via `mail.fetch(e_id, "(BODY.PEEK[])")`.
- Emails remain UNSEEN, which means every 60 seconds the same emails are retrieved.
- Paused conversations are skipped inside `check_lead_emails` after fetching the entire body, but because they remain UNSEEN, they will be fetched in full repeatedly.
- The previous worker added `processed_message_ids` initialization and a check inside `process_lead_email`, but failed to properly implement skipping already-processed messages at the `check_lead_emails` level, causing infinite loops. The email IDs were appended during execution, but since the full body was fetched repeatedly and the inner check was insufficient or bypassed, the agent re-processed them continuously.

## 2. Logic Chain
- To fix the infinite loop of fetching paused emails and skipping processed messages properly without downloading their entire body:
  1. We must query the Supabase database inside `check_lead_emails` to retrieve **both** `paused_emails` and all `processed_message_ids` across conversations.
  2. For each UNSEEN email, we must fetch only the headers first using `mail.fetch(e_id, "(BODY.PEEK[HEADER.FIELDS (MESSAGE-ID FROM)])")`.
  3. We extract `Message-ID` and `From` from the headers.
  4. If the parsed `sender_email` is in `paused_emails` OR the `Message-ID` is in `processed_message_ids`, we `continue` (skip it early).
  5. If the email is neither paused nor processed, we then fetch the full body using `mail.fetch(e_id, "(BODY.PEEK[])")` and proceed to invoke `process_lead_email`.

## 3. Caveats
- `BODY.PEEK[]` leaves the emails UNSEEN on the IMAP server. They will continuously be returned by `mail.search(None, "UNSEEN")`. Over time, the list of UNSEEN emails may grow large. Fetching just the headers for hundreds of UNSEEN emails every 60 seconds is lightweight enough for now, but a long-term solution might involve moving processed/paused emails to a different folder or explicitly marking them SEEN (which contradicts M1's `BODY.PEEK` requirement, so we adhere to `BODY.PEEK`).
- The database query to collect all `processed_message_ids` from `email_lead_conversations` will load the `collected_data` column for all active/initiated records, which is fine for current scale but could be optimized later.

## 4. Conclusion
We need to modify `check_lead_emails` to:
1. Fetch `client_email` and `collected_data` from `email_lead_conversations` to build a `paused_emails` set and a `processed_message_ids` set.
2. Inside the `for e_id in email_ids:` loop, execute a header-only fetch: `res, header_data = mail.fetch(e_id, "(BODY.PEEK[HEADER.FIELDS (MESSAGE-ID FROM)])")`.
3. Parse the `Message-ID` and `sender_email`.
4. Implement the guard clauses: skip if `sender_email in paused_emails` or `msg_id in processed_message_ids`.
5. If passed, execute `res, msg_data = mail.fetch(e_id, "(BODY.PEEK[])")` and parse the full body and attachments, then call `process_lead_email` asynchronously.

## 5. Verification Method
1. Ensure the implementer applies the two-step `mail.fetch` exactly as described.
2. Monitor the agent logs. When an email with a previously processed `Message-ID` or from a paused sender is detected, the log `Message <msg_id> already processed. Skipping.` or `Skipping email from paused conversation` should appear without any subsequent Gemini API calls or SMTP replies.
