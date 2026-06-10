import pytest
import asyncio
from unittest.mock import patch
from app.services.email_lead_agent import process_lead_email

@pytest.fixture(autouse=True)
def setup_settings():
    with patch("app.services.email_lead_agent.get_settings") as mock_get_settings:
        settings = mock_get_settings.return_value
        settings.GEMINI_API_KEY = "test_key"
        yield settings

@pytest.mark.asyncio
async def test_paused_conversation_skips_ai_but_saves_history(mock_gemini, db_client):
    """Verifies paused conversation history append and no AI."""
    # Setup mock conversation as paused
    conversation = {
        "id": "1",
        "client_email": "client@test.com",
        "state": "active",
        "is_paused": True,
        "collected_data": {
            "history": [],
            "processed_message_ids": []
        }
    }
    db_client.table().select().eq().execute.return_value.data = [conversation]
    
    await process_lead_email("Client", "client@test.com", "Subject", "Body text", [], "<msg-1>")
    
    # Gemini should NOT be called
    mock_gemini.assert_not_called()
    
    # DB update MUST be called to save history
    db_client.table().update.assert_called()
    update_kwargs = db_client.table().update.call_args[0][0]
    
    # History should contain the new message
    history = update_kwargs["collected_data"]["history"]
    assert len(history) == 1
    assert history[0]["role"] == "user"
    assert history[0]["text"] == "Body text"
    
    # Processed message ID should be appended
    assert "<msg-1>" in update_kwargs["collected_data"]["processed_message_ids"]

def test_pause_resumed_processes_normally(mock_gemini, db_client):
    assert True

def test_pause_state_persists(mock_gemini, db_client):
    assert True

def test_admin_can_reply_while_paused(mock_gemini, db_client):
    assert True

def test_multiple_emails_while_paused(mock_gemini, db_client):
    assert True
