import asyncio
import imaplib
from unittest.mock import MagicMock, patch
import sys
import os

# Add the project root to python path
sys.path.insert(0, '/home/dazaran/Загрузки/OUT Tattoo WEB')

from app.services.email_lead_agent import check_lead_emails
from app.config import Settings

async def run_test():
    with patch('app.services.email_lead_agent.get_settings') as mock_settings, \
         patch('app.services.email_lead_agent.imaplib.IMAP4_SSL') as mock_imap, \
         patch('app.services.email_lead_agent.get_supabase_client') as mock_supabase, \
         patch('app.services.email_lead_agent.process_lead_email') as mock_process:
        
        # Mock settings
        settings = Settings(
            LEAD_CAPTURE_IMAP_SERVER='imap.test.com',
            LEAD_CAPTURE_EMAIL='test@test.com',
            LEAD_CAPTURE_PASSWORD='password',
            GEMINI_API_KEY='key',
            SUPABASE_URL='url',
            SUPABASE_KEY='key'
        )
        mock_settings.return_value = settings
        
        # Mock IMAP
        mock_mail = MagicMock()
        mock_imap.return_value = mock_mail
        mock_mail.search.return_value = ('OK', [b'1'])
        
        # Mock fetch to return a simple email
        email_content = b'From: client@paused.com\r\nSubject: Test\r\nMessage-ID: <123@test>\r\n\r\nHello'
        mock_mail.fetch.return_value = ('OK', [(b'1 (BODY.PEEK[])', email_content)])
        
        # Mock Supabase
        mock_db = MagicMock()
        mock_supabase.return_value = mock_db
        mock_db.table().select().eq().in_().execute.return_value = MagicMock(data=[{'client_email': 'client@paused.com'}])
        
        loop = asyncio.get_event_loop()
        check_lead_emails(loop)
        
        # Assertions
        mock_mail.search.assert_called_with(None, 'UNSEEN')
        mock_mail.fetch.assert_called_with(b'1', '(BODY.PEEK[])')
        
        # Check if store was called to mark as Seen
        store_calls = mock_mail.store.call_args_list
        print(f"IMAP store calls: {store_calls}")
        if len(store_calls) == 0:
            print("FAILED: mail.store was never called to mark email as SEEN.")
        else:
            print("PASS: mail.store was called.")

if __name__ == "__main__":
    asyncio.run(run_test())
