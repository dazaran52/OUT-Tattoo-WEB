import unittest
from unittest.mock import MagicMock, patch

# Mock settings
class MockSettings:
    LEAD_CAPTURE_IMAP_SERVER = "imap.test.com"
    LEAD_CAPTURE_EMAIL = "test@test.com"
    LEAD_CAPTURE_PASSWORD = "pass"
    LEAD_REPLY_EMAIL = "reply@test.com"

# We will test the check_lead_emails function's behavior regarding SEEN status.
# Since the code uses (BODY.PEEK[]), it never issues a store command to mark as SEEN.

class TestCheckLeadEmails(unittest.TestCase):
    @patch("app.services.email_lead_agent.get_settings", return_value=MockSettings())
    @patch("app.services.email_lead_agent.get_supabase_client")
    @patch("app.services.email_lead_agent.imaplib.IMAP4_SSL")
    def test_paused_email_not_marked_seen(self, mock_imap_class, mock_supabase, mock_settings):
        # Setup mock IMAP
        mock_mail = MagicMock()
        mock_imap_class.return_value = mock_mail
        
        # Setup mock messages
        mock_mail.search.return_value = ("OK", [b"1"])
        mock_mail.fetch.return_value = ("OK", [
            (b'1 (BODY.PEEK[])', b'From: client@paused.com\nSubject: Test\n\nBody')
        ])
        
        # Setup mock Supabase
        mock_supabase_client = MagicMock()
        mock_supabase.return_value = mock_supabase_client
        mock_response = MagicMock()
        mock_response.data = [{"client_email": "client@paused.com"}]
        mock_supabase_client.table().select().eq().in_().execute.return_value = mock_response
        
        # Run function
        from app.services.email_lead_agent import check_lead_emails
        check_lead_emails(MagicMock())
        
        # Assertions
        # 1. Email is fetched with PEEK
        mock_mail.fetch.assert_called_with(b"1", "(BODY.PEEK[])")
        
        # 2. Assert NO store command was called to mark as SEEN
        mock_mail.store.assert_not_called()
        
        # This proves the email remains UNSEEN and will be fetched again on the next loop.

if __name__ == "__main__":
    unittest.main()
