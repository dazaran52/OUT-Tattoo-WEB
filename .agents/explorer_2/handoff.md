# Handoff Report: Email Lead Agent Fix Strategy

## Observation
- Investigated `backend/app/services/email_lead_agent.py` at line 465. Currently, the script fetches the entire UNSEEN email using `mail.fetch(e_id, "(BODY.PEEK[])")` before checking any processing logic.
- The `sender_email in paused_emails` check happens *after* the full body and attachments have been downloaded.
- If skipped via `continue` (or early returned in `process_lead_email`), the email remains `UNSEEN` due to the `BODY.PEEK[]` flag.
- Because it remains UNSEEN, the script refetches the entire email (including any large image attachments) every 60 seconds for both paused and already-processed emails.

## Logic Chain
1. To mitigate the catastrophic infinite loops of downloading attachments and calling AI/SMTP, we must intercept these emails *before* downloading their full bodies.
2. By leveraging IMAP's ability to fetch specific headers `(BODY.PEEK[HEADER.FIELDS (MESSAGE-ID FROM)])`, we can obtain the `sender_email` and `Message-ID` securely and lightly.
3. We need to query the database once for all `processed_message_ids` at the beginning of the polling cycle to avoid making an individual Supabase query for every fetched email header.
4. With the pre-fetched `paused_emails` and `processed_message_ids`, we can perform a lightweight early-exit check.
5. If the email belongs to a paused conversation or is already processed, we use `continue` to bypass the full body fetch.
6. If the email is valid, we proceed to fetch `(BODY.PEEK[])` and parse it normally.

## Caveats
- Using `continue` without marking the email as read (`\Seen`) means the script will still infinitely poll the headers of these skipped emails every 60 seconds. While this is drastically faster and avoids Gemini/SMTP loops or heavy attachment downloads, it still wastes a small amount of bandwidth. If the intent is to stop fetching them entirely, a `mail.store(e_id, '+FLAGS', '\\Seen')` should be added before `continue`. However, strictly following the instruction, only `continue` is proposed.
- Fetching all `processed_message_ids` from all conversations might become slow if the database grows extremely large. For current scale, it is the most efficient method to avoid N+1 queries.

## Conclusion
The fix requires restructuring the `check_lead_emails` function. First, we aggregate a `processed_message_ids` set from `email_lead_conversations`. Inside the email loop, we execute a targeted IMAP header fetch. If the `Message-ID` or `sender_email` hits our skip criteria, we `continue`. Otherwise, we execute the full `BODY.PEEK[]` fetch and call `process_lead_email`.

## Verification Method
1. The Implementer should modify `backend/app/services/email_lead_agent.py` to match the exact strategy.
2. To verify, start the backend server and send an email from a paused client email address.
3. Inspect the logs: The system should output `"Skipping email <ID> from <email> (paused or processed)."` and **not** download the full body or trigger `process_lead_email`.
4. The same log should appear for any duplicate `Message-ID` that is already in the database's `collected_data->processed_message_ids`.
