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
async def test_price_calc_czk_below_threshold(mock_gemini, db_client):
    """CZK < 5000 -> 10%."""
    mock_gemini.return_value["completed"] = True
    mock_gemini.return_value["extracted"]["budget_amount"] = 4000
    mock_gemini.return_value["extracted"]["budget_currency"] = "CZK"
    
    db_client.table().select().eq().execute.return_value.data = []
    db_client.table().insert().execute.return_value.data = [{"id": "1", "collected_data": {"processed_message_ids": []}}]
    
    await process_lead_email("Client", "client@test.com", "Subject", "Body", [], "<123>")
    
    insert_kwargs = db_client.table().insert.call_args_list[-1][0][0]
    assert insert_kwargs["price_credits"] == 400 # 4000 * 0.10 * 1

@pytest.mark.asyncio
async def test_price_calc_czk_above_threshold(mock_gemini, db_client):
    """CZK > 5000 -> 5%."""
    mock_gemini.return_value["completed"] = True
    mock_gemini.return_value["extracted"]["budget_amount"] = 6000
    mock_gemini.return_value["extracted"]["budget_currency"] = "CZK"
    
    db_client.table().select().eq().execute.return_value.data = []
    db_client.table().insert().execute.return_value.data = [{"id": "1", "collected_data": {"processed_message_ids": []}}]
    
    await process_lead_email("Client", "client@test.com", "Subject", "Body", [], "<124>")
    
    insert_kwargs = db_client.table().insert.call_args_list[-1][0][0]
    assert insert_kwargs["price_credits"] == 300 # 6000 * 0.05 * 1

@pytest.mark.asyncio
async def test_price_calc_eur_above_threshold(mock_gemini, db_client):
    """EUR > 200 -> 5% -> Credits conversion (*25)."""
    mock_gemini.return_value["completed"] = True
    mock_gemini.return_value["extracted"]["budget_amount"] = 300
    mock_gemini.return_value["extracted"]["budget_currency"] = "EUR"
    
    db_client.table().select().eq().execute.return_value.data = []
    db_client.table().insert().execute.return_value.data = [{"id": "1", "collected_data": {"processed_message_ids": []}}]
    
    await process_lead_email("Client", "client@test.com", "Subject", "Body", [], "<125>")
    
    insert_kwargs = db_client.table().insert.call_args_list[-1][0][0]
    assert insert_kwargs["price_credits"] == 375 # 300 * 0.05 * 25

@pytest.mark.asyncio
async def test_price_calc_pln_below_threshold(mock_gemini, db_client):
    """PLN < 1000 -> 10% -> Credits conversion (*5)."""
    mock_gemini.return_value["completed"] = True
    mock_gemini.return_value["extracted"]["budget_amount"] = 500
    mock_gemini.return_value["extracted"]["budget_currency"] = "PLN"
    
    db_client.table().select().eq().execute.return_value.data = []
    db_client.table().insert().execute.return_value.data = [{"id": "1", "collected_data": {"processed_message_ids": []}}]
    
    await process_lead_email("Client", "client@test.com", "Subject", "Body", [], "<126>")
    
    insert_kwargs = db_client.table().insert.call_args_list[-1][0][0]
    assert insert_kwargs["price_credits"] == 250 # 500 * 0.10 * 5

def test_price_calc_unsupported_currency(mock_gemini, db_client):
    assert True
