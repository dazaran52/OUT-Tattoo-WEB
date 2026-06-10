# Handoff Report: E2E Test Integrity & Agent Bugs

## 1. Observation
The Forensic Auditor identified an INTEGRITY VIOLATION because the E2E test files for Milestone 2 (e.g., `tests/e2e/tier1_feature_coverage/test_f5_admin_pause.py` and `test_f1_imap_unseen.py`) contain only empty functions with `pass` statements. They do not actually verify the genuine implementation in `email_lead_agent.py`.
Furthermore, there are two functional bugs reported by reviewers in the implementation:
- **Reviewer 2 Bug:** Emails received during a "paused" conversation are completely ignored rather than appended to the conversation history.
- **Challenger 2 Bug:** The script relies on an in-memory `seen_uids` cache added before processing. If AI or SMTP fails, the email remains in the cache and is skipped in all future polls (transient drop). Also, on restart, if completed conversations are not fully pre-fetched, the agent falls back to doing full IMAP body fetches and O(1) DB queries per old UNSEEN email.

## 2. Logic Chain
To resolve the Integrity Violation, the test suite must contain genuine assertions. The current test fixtures in `conftest.py` mock `google.generativeai.GenerativeModel`, but the agent actually uses HTTP REST calls (`httpx.AsyncClient`) to Gemini. The fixtures also partially mock `imaplib` but omit `uid()`. The tests need proper patching to invoke the core asynchronous loop (`check_lead_emails` or `process_lead_email`) and assert the side effects (like database updates and API calls).
To resolve the bugs:
- The transient drop requires moving the `seen_uids.add(e_uid)` cache insertion to **after** a successful return from `process_lead_email`.
- The O(N) restart bug requires either batching the IMAP header fetches or extracting sender emails from the headers and performing an `in_("client_email", ...)` DB query *before* doing full BODY fetches.
- The pause history bug requires modifying `process_lead_email` to append the message to the conversation history and update the DB even when `is_paused` is true, but short-circuiting before AI generation or SMTP replies.

## 3. Caveats
Due to CODE_ONLY mode, test runs rely purely on local execution. The API backend (`main.py` -> `routers/admin.py`) exists and has the `/api/admin/conversations/{id}/pause` endpoint, meaning `TestClient` can be used directly. The Supabase DB client in `conftest.py` is deeply mocked but might need adjustments to support `.in_()` queries or dictionary `.get()` calls used by the updated logic.

## 4. Conclusion
The Worker must replace the dummy test functions with real assertions using `unittest.mock` or `pytest-mock`, update the broken test fixtures, and fix the functional bugs in `email_lead_agent.py`. The strategy below outlines the exact steps.

## 5. Verification Method
Run `pytest tests/e2e/tier1_feature_coverage/test_f1_imap_unseen.py tests/e2e/tier1_feature_coverage/test_f5_admin_pause.py` to ensure the tests execute genuine logic and pass. Inspect the files to confirm the absence of `pass` and presence of `assert` statements.

---

# STRATEGY FOR WORKER

### Step 1: Fix the `email_lead_agent.py` Bugs
Modify `backend/app/services/email_lead_agent.py`:
1. **Fix Transient Drops**:
   Modify `process_lead_email` to explicitly `return True` upon completely successful processing (including the paused state saving). `return False` on Gemini or SMTP failures.
   In `check_lead_emails`, capture the result:
   ```python
   success = future.result()
   if success:
       seen_uids.add(e_uid)
   ```
   Do not add `e_uid` to `seen_uids` at the top of the loop.

2. **Fix Paused Conversation History (Reviewer 2)**:
   In `check_lead_emails`, remove the block (lines 514-527) that forcibly skips emails if the conversation is paused. Let it reach `process_lead_email`.
   In `process_lead_email`, fetch the body, parse the attachments, append the user message to `collected_data["history"]`, and if `conversation.get("is_paused")` is true:
   - Append `msg_id` to `processed_message_ids`.
   - Update the DB `email_lead_conversations`.
   - `return True` immediately (Do NOT call Gemini API or send an SMTP reply).

3. **Fix O(N) Restart Queries (Challenger 2)**:
   Instead of pre-fetching conversations blindly at the start of `check_lead_emails`, first iterate over all UNSEEN emails to fetch **only their headers**.
   Collect all `sender_email`s into a list.
   Then, run a single DB query using `.in_("client_email", list_of_sender_emails)`. This handles 1000+ completed conversations cleanly.
   Then, loop over the emails again, checking the fetched DB rows. If it's a known `msg_id`, skip. Only if it's new, perform the `(BODY.PEEK[])` full fetch and call `process_lead_email`.

### Step 2: Fix `conftest.py` Test Fixtures
1. Change `mock_gemini` to patch `app.services.email_lead_agent.call_gemini_api` directly, returning a valid parsed JSON dictionary:
   ```python
   @pytest.fixture
   def mock_gemini(mocker):
       return mocker.patch('app.services.email_lead_agent.call_gemini_api', return_value={
           "reply": "Test reply",
           "completed": False,
           "extracted": {"style": "Realism"}
       })
   ```
2. Update `mock_imap` to properly mock the `.uid` method, returning valid tuples for `SEARCH` and `FETCH`.

### Step 3: Implement Genuine E2E Tests
Replace the `pass` statements in the following files with actual test logic:
1. **`test_f5_admin_pause.py`**:
   - `test_pause_endpoint_sets_flag_true`: Use FastAPI `TestClient` (or `api_client` if properly set up) to send `PUT /api/admin/conversations/123/pause` with `{"is_paused": true}` and assert the response.
   - `test_agent_ignores_paused_conversations`: Pre-populate the mock DB with a paused conversation. Call `process_lead_email`. Assert that the email body is added to `history` but `mock_gemini` is **not** called.
2. **`test_f1_imap_unseen.py`**:
   - `test_new_email_leaves_unseen_status`: Call `check_lead_emails(loop)` and verify `mock_imap.uid.assert_any_call('FETCH', <uid>, '(BODY.PEEK[])')` was executed.
   - `test_error_during_processing_does_not_save_id`: Configure `mock_gemini` to return `None`. Call `process_lead_email`. Assert it returns `False` and the DB update for `processed_message_ids` was not called.

Implement these genuine assertions across all tests in `tier1_feature_coverage` and `tier2_boundary_cases` relating to your assigned work to pass the Integrity Audit.
