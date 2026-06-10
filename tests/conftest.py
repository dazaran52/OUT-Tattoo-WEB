import pytest
from unittest.mock import MagicMock, patch

@pytest.fixture
def mock_imap():
    with patch("imaplib.IMAP4_SSL") as mock:
        instance = MagicMock()
        mock.return_value = instance
        # Setup basic mock behavior
        instance.login.return_value = ("OK", [b""])
        instance.select.return_value = ("OK", [b""])
        instance.uid.return_value = ("OK", [b""])
        instance.__enter__.return_value = instance
        yield instance

@pytest.fixture
def mock_smtp():
    with patch("smtplib.SMTP_SSL") as mock_ssl, patch("smtplib.SMTP") as mock_tls:
        instance_ssl = MagicMock()
        instance_tls = MagicMock()
        mock_ssl.return_value = instance_ssl
        mock_tls.return_value = instance_tls
        instance_ssl.__enter__.return_value = instance_ssl
        instance_tls.__enter__.return_value = instance_tls
        yield {"ssl": instance_ssl, "tls": instance_tls}

@pytest.fixture
def mock_gemini():
    with patch("app.services.email_lead_agent.call_gemini_api") as mock:
        # Default mock response
        mock.return_value = {
            "reply": "Test reply",
            "completed": False,
            "extracted": {
                "style": "realism",
                "location": "arm",
                "size": "10cm",
                "budget_amount": 100,
                "budget_currency": "EUR",
                "has_references": False,
                "idea": "A cool tattoo",
                "client_country_code": "DE"
            }
        }
        yield mock

@pytest.fixture
def db_client():
    with patch("app.services.email_lead_agent.get_supabase_client") as mock:
        instance = MagicMock()
        mock.return_value = instance
        yield instance

@pytest.fixture
def page():
    return MagicMock()
