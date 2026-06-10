import sys
import asyncio
import io

# Mock dependencies
class MockSupabaseTable:
    def __init__(self, data):
        self.data = data
        self.select_calls = 0

    def select(self, columns):
        return self

    def eq(self, column, value):
        self.last_query_value = value
        return self

    def execute(self):
        self.select_calls += 1
        return type('Response', (), {'data': [row for row in self.data if row['client_email'] == self.last_query_value]})()

class MockSupabaseClient:
    def __init__(self, table_data):
        self.table_data = table_data
        self.tables = {}

    def table(self, name):
        if name not in self.tables:
            self.tables[name] = MockSupabaseTable(self.table_data)
        return self.tables[name]

class MockIMAP:
    def __init__(self, emails):
        self.emails = emails
        self.fetches = []

    def login(self, u, p): pass
    def select(self, f): pass
    def search(self, criterion, flag):
        return "OK", [" ".join([str(e['id']) for e in self.emails]).encode()]

    def fetch(self, e_id, query):
        e_id = int(e_id.decode())
        self.fetches.append((e_id, query))
        email_data = next(e for e in self.emails if e['id'] == e_id)
        if "HEADER" in query:
            header_str = f"From: {email_data['from']}\r\nMessage-ID: {email_data['msg_id']}\r\nSubject: Test\r\nDate: {email_data.get('date', '')}\r\n"
            return "OK", [(b"1 (HEADER)", header_str.encode())]
        elif "BODY.PEEK[]" in query:
            return "OK", [(b"1 (BODY)", b"Subject: Test\r\n\r\nBody content")]

    def logout(self): pass

# Patch dependencies
import app.services.email_lead_agent as agent
from app.services.email_lead_agent import check_lead_emails

def run_test():
    # Setup test data
    test_emails = [
        {'id': 1, 'from': 'paused@example.com', 'msg_id': '<p1@example.com>'},
        {'id': 2, 'from': 'processed@example.com', 'msg_id': '<p2@example.com>'},
        {'id': 3, 'from': 'new@example.com', 'msg_id': '<p3@example.com>'},
    ]
    
    table_data = [
        {'client_email': 'paused@example.com', 'is_paused': True, 'collected_data': {}},
        {'client_email': 'processed@example.com', 'is_paused': False, 'collected_data': {'processed_message_ids': ['<p2@example.com>']}},
        {'client_email': 'new@example.com', 'is_paused': False, 'collected_data': {}}
    ]
    
    # Mocks
    mock_imap = MockIMAP(test_emails)
    mock_supabase = MockSupabaseClient(table_data)
    
    agent.imaplib.IMAP4_SSL = lambda h, p: mock_imap
    agent.get_supabase_client = lambda: mock_supabase
    
    # Settings mock
    class Settings:
        LEAD_CAPTURE_IMAP_SERVER = "imap.test.com"
        LEAD_CAPTURE_EMAIL = "bot@test.com"
        LEAD_CAPTURE_PASSWORD = "pass"
        LEAD_REPLY_EMAIL = "reply@test.com"
    agent.get_settings = lambda: Settings()
    
    # Run function
    loop = asyncio.get_event_loop()
    check_lead_emails(loop)
    
    # Assertions
    print(f"Total IMAP Fetches: {len(mock_imap.fetches)}")
    for f in mock_imap.fetches:
        print(f"  IMAP Fetch: ID={f[0]}, Query={f[1]}")
    
    print(f"Total Supabase select calls: {mock_supabase.tables['email_lead_conversations'].select_calls}")
    
    # Verify paused skipped
    paused_fetches = [f for f in mock_imap.fetches if f[0] == 1]
    print(f"Paused email fetches: {[f[1] for f in paused_fetches]}")
    assert any("HEADER" in f for f in [f[1] for f in paused_fetches])
    assert not any("BODY.PEEK[]" in f for f in [f[1] for f in paused_fetches])
    
    # Verify processed skipped
    processed_fetches = [f for f in mock_imap.fetches if f[0] == 2]
    print(f"Processed email fetches: {[f[1] for f in processed_fetches]}")
    assert any("HEADER" in f for f in [f[1] for f in processed_fetches])
    assert not any("BODY.PEEK[]" in f for f in [f[1] for f in processed_fetches])
    
    # Verify new downloaded
    new_fetches = [f for f in mock_imap.fetches if f[0] == 3]
    print(f"New email fetches: {[f[1] for f in new_fetches]}")
    assert any("HEADER" in f for f in [f[1] for f in new_fetches])
    assert any("BODY.PEEK[]" in f for f in [f[1] for f in new_fetches])

    print("Test passed.")

if __name__ == "__main__":
    run_test()
