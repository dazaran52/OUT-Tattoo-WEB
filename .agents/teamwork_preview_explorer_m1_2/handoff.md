# Handoff Report: Milestone 1 Analysis (Explorer)

## 1. Observation
- **R1 (UNSEEN logic)**: `backend/app/services/email_lead_agent.py` line 402 uses `res, msg_data = mail.fetch(e_id, "(BODY[])")` which implicitly marks emails as SEEN. `process_lead_email` does not track processed message IDs, causing duplicate processing if emails remain UNSEEN.
- **R2 (Gemini Prompt)**: `call_gemini_api` schema extracts `budget`, `budget_numeric`, and `summary`. The schema and `system_prompt` must be updated to extract the 8 new fields: `style`, `location`, `size`, `budget_amount`, `budget_currency`, `has_references`, `idea`, `client_country_code`.
- **R3 (Multicurrency Calc)**: `process_lead_email` line 301 hardcodes a threshold of 5000 and calculates a raw percentage without considering multi-currency conversions to "Credits" (CZK=1, EUR=25, PLN=5).
- **R4 (IMAP Sent Append)**: `send_smtp_reply` currently only sends via SMTP. It does not append the sent message to the `Sent` IMAP folder.

## 2. Logic Chain
1. To satisfy R1, changing `(BODY[])` to `(BODY.PEEK[])` will preserve the UNSEEN flag. However, to prevent infinite processing loops, `process_lead_email` must check `collected_data.get("processed_message_ids")` against the email's `Message-ID`. If it exists, return early; otherwise, append it.
2. To satisfy R2, the Gemini schema in `call_gemini_api` must drop `budget`, `budget_numeric`, and `summary`, and add the new exact keys. The keys must then be correctly extracted and updated in `collected_data` at line 286.
3. To satisfy R3, the pricing logic must check `budget_currency`. Depending on the currency (CZK, EUR, PLN), it applies the correct threshold (5000, 200, 1000) and multiplier (1, 25, 5). The `price_credits` is calculated as `int(budget_amount * percent * multiplier)`.
4. To satisfy R4, an IMAP connection is needed inside `send_smtp_reply` after a successful SMTP send. We can deduce the IMAP server by replacing "smtp" with "imap" in `settings.LEAD_REPLY_SMTP_SERVER`. We use `imap.append("Sent", "\\Seen", ...)` with the message bytes.

## 3. Caveats
- **IMAP Appending Folder Name**: The script will append to the `"Sent"` folder. Depending on the email provider (e.g., VK WorkSpace/Mail.ru), the standard folder might be `"Отправленные"`. If `"Sent"` throws a `NO` response, it may require a fallback. We assume `"Sent"` as per the exact phrasing in the requirements.
- **IMAP Server Host**: There is no explicit `LEAD_REPLY_IMAP_SERVER` setting in `config.py`. Using `.replace("smtp", "imap")` on the SMTP server is an industry standard convention that should work for mail.ru.
- **Concurrency**: Writing to `processed_message_ids` concurrently might have race conditions in Supabase if multiple emails for the same thread arrive exactly at the same time, but for polling IMAP sequentially this is sufficient.

## 4. Conclusion
The changes needed for Milestone 1 are confined to `backend/app/services/email_lead_agent.py`. The strategy requires targeted block replacements in:
1. `check_lead_emails`: `(BODY[])` -> `(BODY.PEEK[])`.
2. `process_lead_email`: Initialization and checking of `processed_message_ids` against `original_msg_id`.
3. `call_gemini_api`: Updating the JSON schema and required fields.
4. `process_lead_email`: Updating the dynamic pricing block to switch on currency and compute `price_credits`.
5. `send_smtp_reply`: Adding an `IMAP4_SSL` block to append the sent email.

## 5. Verification Method
- **Static**: Review the diff in `email_lead_agent.py` to ensure all 4 requirements are addressed.
- **Tests**: Run the test infra suite: `pytest tests/e2e/` (if implemented) or manually invoke the loop with a test email. Ensure the email remains UNSEEN in the inbox, and the reply appears in the Sent folder.
- **Database**: Check `email_lead_conversations.collected_data` in Supabase to confirm `processed_message_ids` contains the message ID and the 8 new fields are populated correctly.
