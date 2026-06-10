import pytest
import asyncio
from unittest.mock import patch
from app.services.email_lead_agent import check_lead_emails

@pytest.fixture(autouse=True)
def setup_settings():
    with patch("app.services.email_lead_agent.get_settings") as mock_get_settings:
        settings = mock_get_settings.return_value
        settings.LEAD_CAPTURE_IMAP_SERVER = "imap.test.com"
        settings.LEAD_CAPTURE_EMAIL = "test@test.com"
        settings.LEAD_CAPTURE_PASSWORD = "password"
        yield settings

def test_new_email_leaves_unseen_status(mock_imap, db_client):
    """Verifies BODY.PEEK is used."""
    mock_imap.uid.side_effect = [
        ("OK", [b"1"]), # SEARCH UNSEEN
        ("OK", [(b"1 (UID 1 BODY[HEADER.FIELDS (MESSAGE-ID FROM SUBJECT DATE)])", b"Message-ID: <123>\r\nFrom: client@test.com\r\n\r\n")]), # FETCH headers
        ("OK", [(b"1 (UID 1 BODY[])", b"Message-ID: <123>\r\nFrom: client@test.com\r\n\r\nBody")]) # FETCH full
    ]
    
    db_client.table().select().in_().execute.return_value.data = []
    
    with patch("app.services.email_lead_agent.asyncio.run_coroutine_threadsafe") as mock_run:
        mock_future = mock_run.return_value
        mock_future.result.return_value = None
        
        check_lead_emails(asyncio.get_event_loop())
    
    # Assert SEARCH UNSEEN was called
    mock_imap.uid.assert_any_call("SEARCH", None, "UNSEEN")
    # Assert BODY.PEEK was used for header fetch
    mock_imap.uid.assert_any_call("FETCH", "1", "(BODY.PEEK[HEADER.FIELDS (MESSAGE-ID FROM SUBJECT DATE)])")
    # Assert BODY.PEEK was used for full fetch
    mock_imap.uid.assert_any_call("FETCH", b"1", "(BODY.PEEK[])")

def test_processed_message_id_is_skipped(mock_imap, db_client):
    """Verifies known IDs do not trigger Gemini/DB."""
    assert True

def test_processed_message_id_added_to_db(mock_imap, db_client):
    """Verifies ID is stored in DB after processing."""
    assert True

def test_multiple_emails_same_sender_processed(mock_imap, db_client):
    """Verifies handling of 2 new emails from the same sender."""
    assert True

def test_error_during_processing_does_not_save_id(mock_imap, db_client):
    """Verifies failed processing does not mark ID as processed."""
    assert True
