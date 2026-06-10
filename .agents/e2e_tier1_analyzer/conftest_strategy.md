# E2E Test Harness & Tier 1 Test Structure

## 1. Test Harness Mocking Strategy

For an **opaque-box** testing philosophy, external dependencies should be virtualized at the network boundary where possible.

*   **IMAP / SMTP (Mailpit)**
    *   **Strategy**: Run [Mailpit](https://github.com/axllent/mailpit) via a test container or Docker Compose.
    *   **Why**: Mailpit provides real IMAP and SMTP ports, plus a REST API. 
    *   **How**: The backend is configured to use `localhost:1025` for SMTP and `localhost:1143` for IMAP. Tests use the Mailpit REST API to silently drop new emails into the inbox before the test, and later query the API to verify that outgoing replies (and IMAP Appends to "Sent") occurred.
*   **Supabase (Local Instance)**
    *   **Strategy**: Run a local Supabase stack (`supabase start`) or an isolated PostgreSQL container.
    *   **Why**: Validates real PostgREST interactions, RLS policies, and database triggers.
    *   **How**: Set `SUPABASE_URL` and `SUPABASE_KEY` environment variables to the local instance. Use a fixture to truncate `email_lead_conversations` and `price_credits` tables between tests.
*   **Gemini API (HTTP Mock / VCR)**
    *   **Strategy**: Use `pytest-httpserver` to run a local mock server, or `responses` if running the backend in-process. 
    *   **Why**: Gemini responses are non-deterministic. We need to force specific JSON payloads (e.g., missing fields, different currencies) to test the calculation logic reliably.
    *   **How**: Redirect the Gemini API base URL via environment variable to the mock server, which will return predefined JSON blocks.

---

## 2. conftest.py Fixture Setup

```python
# tests/e2e/conftest.py

import pytest
from playwright.sync_api import Page
from test_utils.mailpit_client import MailpitClient
from test_utils.supabase_client import SupabaseTestClient

@pytest.fixture(scope="session")
def mailpit():
    """Provides a client to interact with the Mailpit REST API."""
    client = MailpitClient(api_url="http://localhost:8025")
    yield client

@pytest.fixture(autouse=True)
def clean_mailpit(mailpit):
    """Clears all emails from Mailpit before each test."""
    mailpit.delete_all_messages()

@pytest.fixture(scope="session")
def supabase():
    """Provides a client for the local Supabase instance."""
    client = SupabaseTestClient(url="...", key="...")
    yield client

@pytest.fixture(autouse=True)
def clean_database(supabase):
    """Truncates relevant tables before each test."""
    supabase.truncate_tables(["email_lead_conversations", "price_credits"])

@pytest.fixture
def mock_gemini(httpserver):
    """Configures pytest-httpserver to return specific Gemini JSON extractions."""
    def _set_gemini_response(json_data: dict):
        httpserver.expect_request("/v1beta/models/gemini-pro:generateContent").respond_with_json({
            "candidates": [{"content": {"parts": [{"text": json.dumps(json_data)}]}}]
        })
    return _set_gemini_response

@pytest.fixture
def api_client():
    """FastAPI TestClient or httpx.AsyncClient pointing to the test environment."""
    from app.main import app
    from fastapi.testclient import TestClient
    with TestClient(app) as client:
        yield client

@pytest.fixture
def admin_page(page: Page):
    """Playwright fixture that logs in as admin and navigates to the dashboard."""
    # (Setup login cookies / localStorage)
    page.goto("http://localhost:3000/admin")
    yield page
```

---

## 3. Tier 1 Test Cases (Feature Coverage)
*Target: 5 tests per feature (30 total). Located in `tests/e2e/tier1_feature_coverage/`*

### `test_f1_imap_unseen.py` (Feature 1: IMAP UNSEEN & Skip Processed)
1. `test_f1_new_email_remains_unseen`: Verify fetching via `BODY.PEEK[]` leaves the email marked as UNSEEN on the IMAP server.
2. `test_f1_processed_email_is_skipped`: Provide an email with a `Message-ID` already in `processed_message_ids`; verify the system ignores it.
3. `test_f1_message_id_added_to_processed_list`: Verify a successfully processed new email has its `Message-ID` appended to `processed_message_ids` in Supabase.
4. `test_f1_multiple_emails_partial_skip`: Provide 2 old emails and 1 new email; verify only the 1 new email is processed.
5. `test_f1_peek_does_not_modify_flags_on_error`: If Gemini extraction fails mid-process, verify the email remains UNSEEN and is not marked processed.

### `test_f2_gemini_extraction.py` (Feature 2: Gemini Data Extraction)
1. `test_f2_extracts_all_8_fields_correctly`: Mock a perfect Gemini response with all 8 fields; verify they are saved to Supabase exactly.
2. `test_f2_handles_missing_optional_fields`: Mock a response missing `has_references`; verify the backend defaults correctly without crashing.
3. `test_f2_parses_boolean_has_references`: Verify `has_references: true` and `false` are properly typed as booleans in the DB.
4. `test_f2_normalizes_country_code`: Verify `client_country_code` is extracted and saved properly (e.g., "CZ", "DE").
5. `test_f2_handles_malformed_json_fallback`: Mock a Gemini response with slightly malformed JSON (e.g. missing quote); verify the backend handles the error gracefully.

### `test_f3_currency_calculation.py` (Feature 3: Multicurrency Logic)
1. `test_f3_czk_above_threshold_5_percent`: Provide budget 6000 CZK. Verify 5% (300 CZK) translates to 300 credits in `price_credits`.
2. `test_f3_czk_below_threshold_10_percent`: Provide budget 4000 CZK. Verify 10% (400 CZK) translates to 400 credits.
3. `test_f3_eur_above_threshold_5_percent`: Provide budget 300 EUR. Verify 5% (15 EUR) translates to 375 credits (15 * 25).
4. `test_f3_pln_below_threshold_10_percent`: Provide budget 800 PLN. Verify 10% (80 PLN) translates to 400 credits (80 * 5).
5. `test_f3_unsupported_currency_fallback`: Provide an unknown currency (e.g., USD); verify fallback behavior (e.g., default calculation or error state).

### `test_f4_imap_sent_folder.py` (Feature 4: Save to Sent)
1. `test_f4_reply_appended_to_sent_folder`: Verify an automated reply triggers an IMAP APPEND command, creating a message in the Sent folder.
2. `test_f4_append_uses_correct_flags`: Verify the appended message in the Sent folder has the `\Seen` flag applied so it doesn't appear unread to the admin.
3. `test_f4_smtp_send_without_append_failure`: Mock an IMAP APPEND failure; verify the system logs the error but the email still gets sent via SMTP.
4. `test_f4_appended_email_contains_correct_headers`: Inspect the Sent folder via Mailpit to verify `To`, `From`, and `Subject` match the generated reply.
5. `test_f4_multiple_replies_appended_in_correct_order`: Process two leads; verify both replies appear in the Sent folder chronologically.

### `test_f5_admin_api.py` (Feature 5: Admin Pause API)
1. `test_f5_pause_api_updates_flag`: Call `PUT /api/admin/conversations/{id}/pause` (pause=true); verify `is_paused` is `true` in DB.
2. `test_f5_unpause_api_resets_flag`: Call `PUT /api/admin/conversations/{id}/pause` (pause=false); verify `is_paused` is `false`.
3. `test_f5_agent_ignores_emails_when_paused`: Set `is_paused=true`; drop a new email from the client; verify the backend agent ignores it entirely.
4. `test_f5_agent_resumes_processing_when_unpaused`: Unpause a conversation; drop a new email; verify the backend processes it and replies.
5. `test_f5_pause_api_returns_404`: Call the pause endpoint with a non-existent conversation ID; verify HTTP 404 response.

### `test_f6_frontend_ui.py` (Feature 6: Frontend UI)
1. `test_f6_ui_displays_country_tag`: Load Admin page; verify the `client_country_code` (e.g., "CZ") renders visibly on the conversation card.
2. `test_f6_ui_filters_conversations_by_country`: Click the country filter drop-down; select "DE"; verify only German leads are visible.
3. `test_f6_ui_pause_button_sends_request`: Click "Перехватить диалог"; intercept the network request and verify it hits the `PUT` pause endpoint.
4. `test_f6_ui_pause_button_toggles_state`: Click "Перехватить диалог"; verify the button text visually changes to indicate the paused state (e.g., "AI Paused").
5. `test_f6_ui_shows_empty_state_for_no_matching_country`: Filter by a country with zero leads; verify the "No conversations found" UI state appears.
