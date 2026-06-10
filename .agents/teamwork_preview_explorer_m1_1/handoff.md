# Handoff Report: Milestone 1 Analysis (email_lead_agent.py)

**Core Findings:** Milestone 1 focuses on updating the core processing logic for email leads, specifically around keeping emails UNSEEN, correctly parsing multi-currency values via Gemini, calculating dynamic pricing, and saving automated replies to the IMAP Sent folder.

## Observation
1. In `check_lead_emails`, the script currently calls `mail.fetch(e_id, "(BODY[])")` which implicitly marks emails as SEEN.
2. `process_lead_email` does not currently store or check a `processed_message_ids` list in the `collected_data` JSONB column, meaning emails kept UNSEEN would be re-processed on every polling loop.
3. The Gemini API schema (`call_gemini_api`) expects `budget`, `budget_numeric`, and `summary`. It lacks the newly required fields: `budget_amount`, `budget_currency`, `has_references`, `idea`, and `client_country_code`.
4. Pricing logic dynamically derives `price_credits` by defaulting to a 5000 threshold regardless of currency.
5. `send_smtp_reply` strictly dispatches emails via `smtplib` but does not connect via IMAP to append the raw email to the Sent folder.

## Logic Chain
1. **R1 (UNSEEN Logic):** Change the fetch command to `(BODY.PEEK[])`. Inside `process_lead_email`, fetch the existing conversation. If `original_msg_id` is found in `conversation["collected_data"].get("processed_message_ids", [])`, the function must log and `return` early. Otherwise, append the ID to the list right before updating the Supabase `email_lead_conversations` table.
2. **R2 (Gemini Schema):** Update `call_gemini_api`'s `responseSchema` properties and `required` list to enforce the new fields. Update `process_lead_email`'s `system_prompt` to instruct the AI to extract these fields. Update history string formatting to replace `summary` with `idea` and split budget into amount and currency.
3. **R3 (Multi-currency Pricing):** Extract `budget_amount` and `budget_currency`. Apply the specific rules:
   - CZK: 5000 threshold, 1x multiplier.
   - EUR: 200 threshold, 25x multiplier.
   - PLN: 1000 threshold, 5x multiplier.
   - Percentage is 5% if above threshold, otherwise 10%. Calculate: `int(budget_amount * percent * multiplier)`.
4. **R4 (IMAP Sent Append):** Extend `send_smtp_reply`. After a successful `smtplib.send_message`, initialize a new `imaplib.IMAP4_SSL(settings.LEAD_CAPTURE_IMAP_SERVER, 993)`, login with `LEAD_REPLY_EMAIL`, and call `imap_server.append("Sent", None, imaplib.Time2Internaldate(time.time()), msg.as_bytes())`.

## Caveats
- **IMAP Overhead:** Fetching `(BODY.PEEK[])` inside `check_lead_emails` implies downloading the entire email (including heavy image attachments) for every `UNSEEN` email on every 60-second tick, even if it is immediately skipped inside `process_lead_email`. A more efficient approach would be to fetch only headers first to check the Message-ID, but this analysis strictly follows the scoped request.
- **IMAP Server & Folder:** The code assumes `LEAD_CAPTURE_IMAP_SERVER` can be reused to login for `LEAD_REPLY_EMAIL`. It also assumes the sent items folder is named `"Sent"`. If the provider (e.g. VK WorkSpace) uses localized folder names (e.g. `"Отправленные"`), the append might fail.

## Conclusion
The strategy is isolated entirely within `backend/app/services/email_lead_agent.py`. The implementer agent should focus on four specific edits:
1. Swap `BODY[]` to `BODY.PEEK[]` and implement early returns in `process_lead_email` using `processed_message_ids`.
2. Overhaul the Gemini JSON schema and prompts.
3. Replace the static `price_credits` block with a currency-aware switch case.
4. Import `time` and add an IMAP append block at the end of `send_smtp_reply`.

## Verification Method
- Check code syntax using `python -m py_compile backend/app/services/email_lead_agent.py`.
- Run the server, send a test email with a budget of "300 EUR" and verify that the calculated credits in Supabase equal `300 * 0.05 * 25 = 375`.
- Verify the email status remains `UNSEEN` on the IMAP server while a corresponding record appears in the `email_lead_conversations` table.
- Log in to the bot's sent mailbox to ensure the automated reply is present in the "Sent" folder.
