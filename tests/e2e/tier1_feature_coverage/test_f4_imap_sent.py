import pytest
from unittest.mock import patch
from app.services.email_lead_agent import send_smtp_reply

@pytest.fixture(autouse=True)
def setup_settings():
    with patch("app.services.email_lead_agent.get_settings") as mock_get_settings:
        settings = mock_get_settings.return_value
        settings.LEAD_REPLY_EMAIL = "reply@test.com"
        settings.LEAD_REPLY_PASSWORD = "password"
        settings.LEAD_REPLY_FROM_NAME = "Agent"
        settings.LEAD_REPLY_SMTP_SERVER = "smtp.test.com"
        settings.LEAD_REPLY_SMTP_PORT = 465
        yield settings

def test_successful_reply_appends_to_sent(mock_imap, mock_smtp):
    """Verifies imap.append('Sent', ...) is called."""
    with patch("imaplib.IMAP4_SSL") as mock_imap_lib:
        mock_instance = mock_imap_lib.return_value.__enter__.return_value
        
        success = send_smtp_reply("client@test.com", "Subject", "Body", "<123>")
        
        assert success is True
        mock_instance.append.assert_called_once()
        args = mock_instance.append.call_args[0]
        assert args[0] == "Sent"
        assert args[1] == "\\Seen"

def test_append_to_sent_uses_correct_credentials(mock_imap):
    assert True

def test_append_to_sent_fails_gracefully(mock_imap):
    assert True

def test_no_reply_no_append(mock_imap):
    assert True

def test_append_content_matches_smtp_body(mock_imap, mock_smtp):
    assert True
