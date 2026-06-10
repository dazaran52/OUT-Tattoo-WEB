import pytest
from unittest.mock import MagicMock, AsyncMock

@pytest.fixture
def mock_imap(mocker):
    mock = mocker.patch('imaplib.IMAP4_SSL', autospec=True)
    instance = mock.return_value
    instance.login.return_value = ('OK', [b'Login successful'])
    instance.select.return_value = ('OK', [b'1'])
    instance.search.return_value = ('OK', [b'1 2'])
    instance.fetch.return_value = ('OK', [b'(BODY[TEXT] {5}\r\nHello)', b')'])
    instance.append.return_value = ('OK', [b'Append successful'])
    return instance

@pytest.fixture
def mock_smtp(mocker):
    mock = mocker.patch('smtplib.SMTP_SSL', autospec=True)
    instance = mock.return_value
    instance.login.return_value = (235, b'Authentication successful')
    instance.send_message.return_value = {}
    return instance

@pytest.fixture
def mock_gemini(mocker):
    mock = mocker.patch('app.services.email_lead_agent.call_gemini_api', new_callable=AsyncMock)
    
    default_response = {
        "reply": "Hello from mock AI",
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
    
    mock.return_value = default_response
    return mock

@pytest.fixture
def db_client(mocker):
    # Stateful mock of Supabase client since we can't spin up testcontainers easily
    mock = mocker.patch('supabase.create_client')
    instance = MagicMock()
    mock.return_value = instance
    
    # Simple state
    db = {'email_lead_conversations': [], 'leads': []}
    
    def mock_table(table_name):
        table_mock = MagicMock()
        def mock_select(*args, **kwargs):
            return table_mock
        def mock_eq(key, value):
            return table_mock
        def mock_in_(key, value_list):
            return table_mock
        def mock_execute():
            class Result:
                data = db[table_name]
            return Result()
        def mock_insert(data):
            class Exec:
                def execute(self):
                    db[table_name].append(data)
                    class Result:
                        data = [data]
                    return Result()
            return Exec()
        def mock_update(data):
            class Exec:
                def execute(self):
                    if db[table_name]:
                        db[table_name][0].update(data)
                    class Result:
                        data = db[table_name]
                    return Result()
            return Exec()
            
        table_mock.select = mock_select
        table_mock.eq = mock_eq
        table_mock.in_ = mock_in_
        table_mock.execute = mock_execute
        table_mock.insert = mock_insert
        table_mock.update = mock_update
        return table_mock
        
    instance.table = mock_table
    instance.db_state = db
    return instance

@pytest.fixture
def api_client(mocker):
    # Fastapi or similar mock client
    mock = mocker.patch('httpx.AsyncClient')
    return mock.return_value

@pytest.fixture
def page(mocker):
    # Playwright page mock
    return MagicMock()
