# Handoff Report: Milestone 1 (Backend Core) Strategy

## 1. Observation
- The project requirement for Milestone 1 includes R1, R2, R3, and R4 based on `ORIGINAL_REQUEST.md` and `PROJECT.md`.
- In `backend/app/services/email_lead_agent.py` line 402, IMAP fetch uses `(BODY[])`, which automatically changes the email status to `SEEN`.
- In `check_lead_emails` and `process_lead_email`, there is currently no check against `processed_message_ids` to deduplicate processing.
- The Gemini schema payload (line 100) and system prompt (line 238) extract `"budget"` as a string and `"summary"`. They do not extract the explicitly requested fields for R2: `budget_amount` (number), `budget_currency` (string), `has_references` (boolean), `idea` (string), and `client_country_code` (string).
- The dynamic pricing logic (line 300) only supports a flat CZK-style integer calculation, lacking EUR/PLN multi-currency support and multiplier mapping (R3).
- In `send_smtp_reply` (line 155), the email is successfully sent via SMTP but there is no IMAP connection code to append it to the outgoing `Sent` folder (R4).
- `backend/app/config.py` confirms `LEAD_REPLY_SMTP_SERVER` is configured (default `"smtp.mail.ru"`).

## 2. Logic Chain
1. **R1 (UNSEEN & Deduplication):** If we change `(BODY[])` to `(BODY.PEEK[])`, the IMAP server will keep the email status as `UNSEEN`. Because the main poll loop searches for `UNSEEN` messages, it will retrieve the same email indefinitely. To prevent this, we must verify if the `Message-ID` exists in `email_lead_conversations` under a new JSON field `processed_message_ids`. This check must loop over all conversations for the `sender_email` in `process_lead_email`, skip if found, and actively append/save it to the active conversation immediately.
2. **R2 (Gemini Schema):** We must redefine the JSON schema in `call_gemini_api` and the text prompt in `process_lead_email` to extract the granular fields required by R2, ensuring they are mapped to the local `collected_data` dictionary.
3. **R3 (Pricing calculation):** The `percentage` threshold depends on the currency (CZK=5000, EUR=200, PLN=1000). The resulting `price_credits` needs a conversion multiplier to equalize values to base credits.
4. **R4 (IMAP Append):** After `smtplib.SMTP` successfully sends the message in `send_smtp_reply`, we can instantiate `imaplib.IMAP4_SSL` using the SMTP host transformed to IMAP (`replace("smtp", "imap")`), log in with the exact same credentials, and invoke `mail.append("Sent", '\\Seen', ...)` to write the bytes of the `EmailMessage`.

## 3. Caveats
- I assumed that the IMAP server for the `LEAD_REPLY` account follows standard naming conventions (e.g., `smtp.mail.ru` -> `imap.mail.ru`). The code uses `.replace("smtp", "imap")`, which is safe for mail.ru. 
- The IMAP folder name for Sent items is hardcoded as `"Sent"`. If the VK WorkSpace server strictly uses `"Отправленные"` and fails on `"Sent"`, the `append` might throw an error. However, standard IMAP usually aliases `"Sent"`. If issues arise during integration testing, this folder string might need configuration.
- We update the `processed_message_ids` array in the DB immediately before Gemini completes generating an answer. This prevents the next 60s poll loop from triggering a duplicate Gemini request on the same `UNSEEN` message.

## 4. Conclusion
The implementation of M1 requires editing `backend/app/services/email_lead_agent.py` to enforce the UNSEEN state, enforce data schema constraints for Gemini, apply a custom multi-currency function, and mirror sent emails to IMAP.

**Strategy for Implementer:**
1. **Line 2: Add Imports**
   - Add `import time` at the top of the file.
2. **Line ~402: IMAP Fetch Update**
   - Change `mail.fetch(e_id, "(BODY[])")` to `mail.fetch(e_id, "(BODY.PEEK[])")`.
3. **Line ~176: Deduplication Check**
   - Replace the single `active` conversation fetch with a select for all rows matching `client_email`.
   - Iterate and check if `original_msg_id` exists in `c.get("collected_data", {}).get("processed_message_ids", [])`. If so, return early.
4. **Line ~189: Initialize Arrays**
   - Add `"processed_message_ids": []` to the new `collected_data` initialization.
5. **Line ~218: Persist Message-ID Early**
   - Append `original_msg_id` to `collected_data["processed_message_ids"]` and run an early `supabase.table("email_lead_conversations").update(...)` to prevent duplicate processing if the script polls again before Gemini replies.
6. **Line ~86: Update Gemini Schema & Prompts**
   - In `call_gemini_api` schema properties, replace `budget`/`budget_numeric`/`summary` with:
     `budget_amount` (NUMBER), `budget_currency` (STRING), `has_references` (BOOLEAN), `idea` (STRING), `client_country_code` (STRING). Update the `required` array.
   - Update `system_prompt` and the mapping loop `for key in [...]` near line 286 to reflect the new keys.
7. **Line ~300: Multi-currency Pricing**
   - Replace the flat `budget_num` pricing check with a block that checks `currency.upper()` (CZK threshold 5000 multiplier 1, EUR threshold 200 multiplier 25, PLN threshold 1000 multiplier 5). Calculate `price_credits = int(b_num * percentage * multiplier)`.
8. **Line ~164: IMAP Sent Append**
   - Inside `send_smtp_reply` after `server.send_message(msg)`, add a `try/except` block to connect to `imaplib.IMAP4_SSL`, login, and `imap_server.append("Sent", '\\Seen', imaplib.Time2Internaldate(time.time()), bytes(msg))`.

## 5. Verification Method
- **Static Check:** Inspect `backend/app/services/email_lead_agent.py` to ensure `BODY.PEEK` is used and `processed_message_ids` is properly populated and queried.
- **Dynamic Check (R1, R4):** Send a test email to the configured `LEAD_CAPTURE_EMAIL`. Verify via an email client that it remains marked as `UNSEEN`. Check the `Sent` folder of the `LEAD_REPLY_EMAIL` account to see if the auto-reply appears.
- **Dynamic Check (R2, R3):** Ensure that the resulting lead in the `leads` table correctly calculates `price_credits` for `EUR` inputs (e.g. 300 EUR -> >200 threshold = 5% = 15 EUR * 25 = 375 credits).
