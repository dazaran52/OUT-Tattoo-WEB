# E2E Tier 1 Strategy & Analysis Handoff

## 1. Observation
- `SCOPE.md` assigns Milestone 1: "Setup pytest, playwright, mocks. Write Tier 1 (Feature Coverage) test cases."
- `TEST_INFRA.md` specifies an "opaque-box, requirement-driven" methodology using `pytest` and `playwright`.
- `TEST_INFRA.md` suggests using "a real or mocked IMAP/SMTP server (e.g. Mailhog/Mailpit) and Supabase (or test DB instance)".
- `ORIGINAL_REQUEST.md` lists 5 explicit requirements that translate into 6 testable features: IMAP preservation (F1), Gemini extraction (F2), Currency logic (F3), IMAP Append (F4), Admin API (F5), and Frontend UI (F6).
- Coverage threshold for Tier 1 is strictly ≥5 tests per feature, totaling 30 tests.

## 2. Logic Chain
- **Test Harness Strategy**:
  - To maintain the "opaque-box" philosophy, the application should run as a black box as much as possible.
  - **IMAP/SMTP**: Deploy a lightweight local mail server (Mailpit) via Docker during test runs. This provides both SMTP (port 1025) and IMAP (port 1143) endpoints. Tests will use the Mailpit REST API to seed the inbox and inspect the Sent folder without touching the backend's internal Python modules.
  - **Supabase**: Use the Supabase CLI (`supabase start`) to spin up a local, isolated testing database. Tests will interact with this instance to clear data and assert state (`email_lead_conversations`).
  - **Gemini API**: Since LLM APIs are non-deterministic, expensive, and slow, we must mock Gemini. Since we want an opaque box, we can start the FastAPI backend with an environment variable pointing the Google Generative AI SDK to a local HTTP mock server (e.g., `WireMock` or a lightweight `pytest-httpserver`), or we can use `pytest-mock` to patch the `google.generativeai` module directly in the test runner if running tests in the same process.
- **Fixture Setup (`conftest.py`)**:
  - `supabase_client`: Connects to the local test Supabase, yields the client, and automatically cleans up tables (`email_lead_conversations`, `price_credits`) between tests.
  - `mailpit_client`: Connects to Mailpit's REST API. Used to inject incoming emails and retrieve emails sent by the backend. Clears the mailbox before each test.
  - `mock_gemini`: Intercepts calls to the generative AI API, returning predefined JSON payloads based on the test case.
  - `api_client`: FastAPI `TestClient` (or `httpx.AsyncClient`) pointing to the local test backend instance.
  - `admin_page`: Playwright fixture pre-authenticated as an admin, navigating to the UI.
- **Test Structuring**: 30 tests divided into 6 test files within `tests/e2e/tier1_feature_coverage/`, strictly covering the logic in `ORIGINAL_REQUEST.md`.

## 3. Caveats
- Setting up Mailpit and local Supabase requires Docker on the CI/CD pipeline. If Docker is unavailable, the fallback is to heavily mock `imaplib`, `smtplib`, and the `supabase-py` client in Python, though this violates strict opaque-box testing.
- Playwright tests (F6) require the frontend to be built and served locally during the test suite execution.

## 4. Conclusion
The Test Harness should utilize Mailpit for email, a local Supabase instance for DB, and an HTTP mock for Gemini. `conftest.py` should orchestrate these dependencies. We need 30 distinct test cases mapping to the 6 features to meet the Tier 1 threshold. 

## 5. Verification Method
- Ensure the proposed 30 test names cover all aspects of `ORIGINAL_REQUEST.md`.
- Validate that the proposed `conftest.py` setup does not directly patch application logic, adhering to the opaque-box requirement.
- Review `conftest_strategy.md` for the specific test lists.
