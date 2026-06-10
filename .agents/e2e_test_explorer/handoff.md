# E2E Test Strategy Handoff Report

## Observation
- **Scope**: Tier 1 tests require 30 test cases (5 tests per feature for Features 1-6).
- **Architecture**: `pytest` + `playwright`, opaque-box requirement-driven testing.
- **Dependencies**: The backend relies on Supabase (via `supabase-py` SDK which uses `httpx`), Gemini API (via direct `httpx` REST calls), and Python standard library `imaplib`/`smtplib`.

## Logic Chain
1. **Opaque-Box E2E Constraint**: We must avoid internal Python `unittest.mock.patch` where possible. Instead, we intercept at the network or protocol boundaries.
2. **Supabase Strategy**: Mocking PostgREST syntax (used by `supabase-py`) at the network layer is unfeasible and error-prone. We must use a real Supabase instance (either a Local Docker instance via `supabase start` or a dedicated Cloud Test Project). State must be cleared between tests to avoid flaky runs.
3. **IMAP/SMTP Strategy**: Since `Mailhog`/`Mailpit` do not fully support IMAP (Mailpit is POP3), we need an actual IMAP server. `greenmail/standalone` is a lightweight Java-based test container that provides IMAP, SMTP, and a REST API for asserting inbox states without mutating the `UNSEEN` flags.
4. **Gemini API Strategy**: The backend uses `httpx` to call the Gemini REST API. We can use the `respx` library to intercept outbound `httpx` calls to `generativelanguage.googleapis.com`, allowing us to inject deterministic LLM JSON responses.
5. **Fixture Orchestration**: `conftest.py` will manage the lifecycle of these external dependencies (spinning up GreenMail, truncating Supabase tables, applying `respx` mocks, setting up Playwright pages).

## Caveats
- Using a real Supabase instance means tests will be slower. Parallel execution (`pytest -n`) might require isolated tenants or separate database schemas to avoid state collision.
- The UI tests require the Frontend (Vite) and Backend (FastAPI) to be actively running on localhost during the `pytest` run.

## Conclusion

### Test Harness Strategy
- **Supabase**: Use a dedicated testing environment (Local or Cloud). Truncate `email_lead_conversations` and `leads` before each test.
- **IMAP/SMTP**: Use `testcontainers-python` with the `greenmail/standalone:latest` image to provide ephemeral email protocols.
- **Gemini API**: Intercept HTTP traffic using `respx` to mock responses deterministically without touching application code.
- **Playwright**: Use the native `pytest-playwright` plugin.

### conftest.py Fixtures
```python
@pytest.fixture(scope="session")
def mail_server():
    # Spins up GreenMail via testcontainers
    ...
@pytest.fixture(autouse=True)
def clean_supabase():
    # Truncates tables before each test
    ...
@pytest.fixture
def mock_gemini(respx_mock):
    # Intercepts httpx calls to generativelanguage.googleapis.com
    ...
@pytest.fixture
def app_client():
    # httpx.AsyncClient pointing to the locally running FastAPI test instance
    ...
```

### Tier 1 Test Structure (tests/e2e/tier1_feature_coverage/)

**Feature 1: IMAP UNSEEN preservation & skip processed** (`test_f1_imap_unseen.py`)
1. `test_f1_new_email_processed_and_unseen_preserved`
2. `test_f1_processed_email_skipped_on_subsequent_fetch`
3. `test_f1_multiple_emails_same_sender_processed_once`
4. `test_f1_peek_does_not_trigger_seen_flag_on_server`
5. `test_f1_unseen_flag_unaffected_when_processing_fails`

**Feature 2: Gemini Data Extraction** (`test_f2_gemini_extraction.py`)
1. `test_f2_extracts_all_required_fields_successfully`
2. `test_f2_handles_missing_optional_fields_gracefully`
3. `test_f2_extracts_country_code_correctly_from_context`
4. `test_f2_extracts_boolean_has_references_correctly`
5. `test_f2_handles_unexpected_gemini_json_format`

**Feature 3: Multicurrency price calculation** (`test_f3_multicurrency.py`)
1. `test_f3_price_czk_above_and_below_threshold`
2. `test_f3_price_eur_above_and_below_threshold`
3. `test_f3_price_pln_above_and_below_threshold`
4. `test_f3_unsupported_currency_fallback_or_error`
5. `test_f3_price_credits_conversion_math_accuracy`

**Feature 4: Save sent emails to IMAP Sent folder** (`test_f4_imap_sent.py`)
1. `test_f4_reply_is_appended_to_sent_folder`
2. `test_f4_sent_folder_append_contains_correct_body_and_headers`
3. `test_f4_sent_folder_missing_handled_gracefully`
4. `test_f4_multiple_replies_appended_correctly`
5. `test_f4_append_failure_does_not_crash_main_process`

**Feature 5: Admin Pause API & Ignore Paused** (`test_f5_admin_pause.py`)
1. `test_f5_pause_api_toggles_is_paused_flag`
2. `test_f5_paused_conversation_ignores_new_incoming_emails`
3. `test_f5_unpausing_resumes_processing_new_emails`
4. `test_f5_pause_api_returns_404_for_invalid_conversation`
5. `test_f5_paused_conversation_does_not_send_auto_replies`

**Feature 6: Frontend UI (Country tag, filter, Pause)** (`test_f6_frontend_ui.py`)
1. `test_f6_country_tag_displayed_in_conversation_list`
2. `test_f6_country_filter_hides_non_matching_conversations`
3. `test_f6_pause_button_sends_put_request_and_updates_ui`
4. `test_f6_pause_button_reflects_current_paused_state`
5. `test_f6_country_filter_all_shows_everything`

## Verification Method
1. Create `tests/e2e/tier1_feature_coverage/` structure with the dummy files containing `def test_...(): pass`.
2. Run `pytest tests/e2e` to ensure all 30 tests are discovered.
3. Validate `respx` and `testcontainers` presence in `requirements-dev.txt` / poetry.
