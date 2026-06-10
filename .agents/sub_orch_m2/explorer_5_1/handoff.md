# Observation
- **Issue 1**: In `tests/e2e/tier1_feature_coverage/test_f5_admin_pause.py`, multiple test functions like `test_pause_resumed_processes_normally` only contain `assert True`. In `tests/e2e/tier2_boundary_cases/test_f5_admin_pause.py` and `tests/e2e/tier4_real_world/test_tier4_real_world.py`, tests contain only `pass`.
- **Issue 2 & 5**: In `backend/app/services/email_lead_agent.py`, the AI generation `call_gemini_api(system_prompt, prompt)` blocks execution. During this time, an admin may pause the conversation (`is_paused=True`). However, the agent never re-checks the database for the `is_paused` flag after the API returns, blindly sending the SMTP reply and overwriting `collected_data` with its stale memory copy, missing any intermediate updates.
- **Issue 3**: In `backend/app/routers/admin.py`, the `pause_conversation` route (`PUT /api/admin/conversations/{conversation_id}/pause`) does not validate if `conversation_id` is a valid UUID before passing it to Supabase, which results in a 500 Internal Server Error when Supabase rejects malformed input.
- **Issue 4**: In `backend/app/services/email_lead_agent.py`, when an email is received, it searches for an existing `initiated` or `active` conversation. If the conversation is `completed`, a new conversation is created with the default `is_paused=False`, bypassing the pause state of previous interactions.

# Logic Chain
1. To resolve **Issue 1**, the Worker must completely replace all `assert True` and `pass` statements in the specified tier 1, tier 2, and tier 4 tests with genuine Pytest code that uses mocks (e.g. `patch` for Supabase client, SMTP, and Gemini API) to verify that pausing skips AI responses and that boundaries are handled correctly.
2. To resolve **Issue 2 and 5**, the agent must:
   - First, append the user's message and `processed_message_ids` to `collected_data` and **save it to the database immediately** (before calling the AI).
   - Then, if `conversation.get("is_paused")` is True, `return` to abort before the AI call.
   - After the `call_gemini_api` completes, re-fetch the conversation from the database (`select("is_paused, collected_data")`).
   - If the newly fetched `is_paused` is True, log and abort immediately (do not send the email and do not overwrite the DB).
   - If it's False, merge the AI's response into the newly fetched `collected_data` (to avoid overwriting intermediate changes) and update the database again.
3. To resolve **Issue 3**, in `backend/app/routers/admin.py`, import `uuid` and try to parse `conversation_id`. If `ValueError` is raised, catch it and raise an `HTTPException(status_code=400, detail="Invalid conversation ID")`.
4. To resolve **Issue 4**, in `backend/app/services/email_lead_agent.py`, when fetching existing conversations for a sender (`conv_resp`), set a local flag `global_is_paused = True` if *any* of the previous conversations have `is_paused == True`. When creating a new conversation for that user, pass `"is_paused": global_is_paused` in the `insert` payload so the pause state persists.

# Caveats
- Relying on `global_is_paused` assumes that if a client was *ever* paused, they remain paused for all future interactions until an admin manually unpauses an active thread. We assume this is the intended domain behavior to stop persistent spam.
- The re-fetch logic for `collected_data` must properly merge the nested fields (like `history` and `images`) to avoid data loss.

# Conclusion
The Worker agent must:
1. Validate `conversation_id` as a UUID in the admin pause router to return a 400 status code.
2. Persist `is_paused` across conversations for the same email.
3. Save the user's email to the DB *before* invoking the Gemini API.
4. Re-fetch the conversation state *after* the Gemini API to check for an admin pause and merge `collected_data`.
5. Rewrite all dummy `pass` and `assert True` test cases in tier 1, tier 2, and tier 4 with full assertions.

# Verification Method
- Execute the backend tests (`pytest tests/e2e/tier1_feature_coverage/test_f5_admin_pause.py tests/e2e/tier2_boundary_cases/test_f5_admin_pause.py tests/e2e/tier4_real_world/test_tier4_real_world.py`) to confirm no `pass` or `assert True` stubs remain and tests pass.
- Send a malformed UUID to the `PUT /api/admin/conversations/invalid-id/pause` endpoint and assert a 400 response.
- Inspect `email_lead_agent.py` to confirm that `collected_data` is saved before the AI call, and re-fetched afterwards before updating.
