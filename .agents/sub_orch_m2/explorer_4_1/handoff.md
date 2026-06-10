# Handoff Report: Milestone 2 Fix Strategy

## 1. Observation
- **Integrity Violation**: The test files in `tests/e2e/tier1_feature_coverage/` and `tests/e2e/tier2_boundary_cases/` (e.g., `test_f1_imap_unseen.py`, `test_f5_admin_pause.py`) consist entirely of dummy functions containing only the `pass` statement. Running `pytest` outputs a false success condition.
- **Bug (Reviewer 2)**: In `backend/app/services/email_lead_agent.py`, when a conversation is paused, new emails are skipped during the header check (`skip_email = True`), preventing them from being downloaded, parsed, and appended to the conversation `history` and `images` arrays.
- **Vulnerability 1 (O(N) DB Queries)**: The pre-fetch query `supabase.table("email_lead_conversations").select("...").execute()` currently fetches all rows, but defaults to a 1000-row limit. Older completed conversations are missed. Thus, the script loops through every UNSEEN email one by one, fetching headers and then querying the DB individually.
- **Vulnerability 2 (Transient Drops)**: `seen_uids.add(e_uid)` happens before AI processing. If the AI/SMTP fails, the email remains in the cache and is silently skipped on future polls, violating the UNSEEN persistence requirement.

## 2. Logic Chain
- **Dummy Tests**: To pass the integrity check, actual testing logic must be implemented using `pytest` and `unittest.mock`. A `conftest.py` must provide mocked dependencies (IMAP, SMTP, Gemini, Supabase). The test functions must assert that the mocks were called with the correct parameters (e.g., asserting `BODY.PEEK` is used).
- **Pause Bug**: Paused conversations should still record the client's message history so admins can see them. Instead of skipping the email in the header check, the script should allow it to be downloaded and appended to `history` in `process_lead_email`. Once added, `process_lead_email` must exit *before* invoking Gemini or sending an SMTP reply.
- **Vulnerability 1**: To optimize and avoid missing old completed conversations, the agent should first fetch all headers for the new UNSEEN emails in one IMAP command (`','.join(email_uids)`). Then extract unique sender emails, and use `.in_("client_email", list(sender_emails))` to fetch only relevant conversations from Supabase.
- **Vulnerability 2**: Removing an email from `seen_uids` in the `except` block ensures that if an error occurs, the email will be correctly re-attempted on the next poll.

## 3. Caveats
- Writing genuine tests for all dummy files might be very large. The Implementer should focus on the Tier 1 Feature Coverage tests to ensure primary features are genuinely tested. If time allows, Tier 2 tests should also be implemented.
- We must mock Supabase carefully, since the actual DB is external. Alternatively, mock the HTTP requests.

## 4. Conclusion & Actionable Strategy
The Implementer must execute the following step-by-step strategy:

**Step 1: Fix Email Lead Agent Logic**
Edit `backend/app/services/email_lead_agent.py`:
- **Fix Vuln 1 (Bulk IMAP Fetch)**: Change the IMAP header fetch to process all `email_uids` in a single command. Extract unique sender emails and pre-fetch conversations using `.in_("client_email", list(unique_emails))`.
- **Fix Vuln 2 (Transient Drops)**: In the loop over `email_uids`, add `seen_uids.discard(e_uid)` inside the `except Exception as email_err:` block.
- **Fix Pause Bug**: Remove the `skip_email = True` logic for `is_paused` during the header check. Allow the email to pass to `process_lead_email`. In `process_lead_email`, *after* appending the new message to `collected_data["history"]` and saving to Supabase, check if the conversation is paused. If so, `return` immediately before calling the Gemini AI prompt.

**Step 2: Setup Pytest Fixtures**
- Create `tests/conftest.py` containing fixtures for `@pytest.fixture def mock_imap()`, `mock_smtp()`, `mock_gemini()`, and `db_client()`.
- Use `unittest.mock.patch` to override the real network clients.

**Step 3: Implement Genuine Tests**
Replace `pass` with actual test logic in `tests/e2e/tier1_feature_coverage/`:
- `test_f1_imap_unseen.py`: Assert `mock_imap` is called with `BODY.PEEK`.
- `test_f2_gemini_extraction.py`: Mock Gemini response and assert the JSON is correctly extracted and saved via `db_client`.
- `test_f3_multicurrency.py`: Test the multi-currency calculation logic by calling the calculation function and asserting the credit values.
- `test_f4_imap_sent.py`: Assert `mock_imap.append('Sent', ...)` is called.
- `test_f5_admin_pause.py`: Simulate a paused conversation. Assert that `check_lead_emails` adds the new email to the `history` DB field but does not call `mock_gemini`.
- `test_f6_frontend_ui.py`: (Optional if frontend test requires Playwright. If not available, mock API calls to ensure pause state toggles).

## 5. Verification Method
- **Tests**: Run `pytest tests/e2e/tier1_feature_coverage/`. Ensure 0 failures and verify the test files actually contain assertion code (no empty `pass` functions).
- **Pause Bug**: Send an email while paused. Verify the `history` field in Supabase contains the new email, and no AI reply was sent.
- **Cache Drops**: Force an exception in `process_lead_email`. Verify the email UID is discarded from `seen_uids` and retried on the next poll.
