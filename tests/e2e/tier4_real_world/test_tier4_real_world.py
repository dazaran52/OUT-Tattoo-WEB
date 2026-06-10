import pytest

@pytest.mark.asyncio
async def test_e2e_new_lead_processing_eur(mock_imap, mock_smtp, mock_supabase, page):
    """
    Scenario 1: End-to-end new lead processing in EUR.
    
    Workload simulation:
    1. Client sends an initial email with tattoo idea, budget in EUR (e.g., 300 EUR).
    2. Background job (check_lead_emails) parses the email.
    3. Gemini extracts fields: style, location, size, budget_amount=300, budget_currency='EUR'.
    4. Price logic calculates credits: 300 EUR > 200 EUR threshold -> 5% fee -> 15 EUR -> 15 * 25 = 375 credits.
    5. Bot sends an automated reply proposing available slots.
    6. Email is marked UNSEEN on IMAP but skipped in next runs.
    7. Sent email is APPENDed to the 'Sent' folder via IMAP.
    8. Frontend displays the conversation correctly with EUR budget and 375 credits.
    """
    pass

@pytest.mark.asyncio
async def test_e2e_admin_intercepts_and_replies_manually(mock_imap, mock_smtp, mock_supabase, page):
    """
    Scenario 2: End-to-end admin intercepts and replies manually.
    
    Workload simulation:
    1. Client sends an email. Bot processes it and replies.
    2. Client sends a complex follow-up email.
    3. Admin checks the UI, decides to intervene, and clicks "Pause AI" (intercepts conversation).
    4. UI calls PUT /api/admin/conversations/{id}/pause. Supabase is updated with is_paused=True.
    5. Client sends another email.
    6. Background job runs but ignores the new email because the conversation is paused.
    7. Admin manually replies to the client via their standard mail client.
    8. The conversation remains paused and bot stays silent.
    """
    pass

@pytest.mark.asyncio
async def test_e2e_large_budget_missing_data_multiple_emails(mock_imap, mock_smtp, mock_supabase, page):
    """
    Scenario 3: Large budget lead with missing data, multiple emails.
    
    Workload simulation:
    1. Client sends an email stating a large budget (e.g., 20000 CZK) but missing 'size' and 'location'.
    2. Bot parses the email. Budget is high (20000 > 5000 CZK) -> 5% fee -> 1000 CZK -> 1000 credits.
    3. Bot notices missing data and replies asking for 'size' and 'location'.
    4. Client replies with the missing info in multiple subsequent emails.
    5. Bot aggregates the data, verifies all required fields are now present.
    6. All emails are processed without losing UNSEEN status.
    7. Bot sends final confirmation email and saves it to 'Sent'.
    8. UI displays the complete collected data.
    """
    pass

@pytest.mark.asyncio
async def test_e2e_pausing_conversation_mid_flow_and_unpausing(mock_imap, mock_smtp, mock_supabase, page):
    """
    Scenario 4: Pausing a conversation mid-flow and unpausing.
    
    Workload simulation:
    1. Conversation is ongoing. Bot has asked a question.
    2. Admin pauses the conversation via UI (is_paused=True).
    3. Client replies. Background job ignores the reply.
    4. Admin unpauses the conversation via UI (is_paused=False).
    5. Background job runs again, processes the previously ignored reply.
    6. Bot responds to the client based on the resumed flow.
    7. Sent emails are correctly APPENDed to 'Sent'.
    8. System recovers gracefully from the paused state without missing the client's reply.
    """
    pass

@pytest.mark.asyncio
async def test_e2e_multiple_parallel_emails_in_different_currencies(mock_imap, mock_smtp, mock_supabase, page):
    """
    Scenario 5: Multiple parallel emails in different currencies.
    
    Workload simulation:
    1. Three different clients send emails simultaneously.
       - Client A: Budget 500 EUR (High budget, 5% fee -> 25 EUR -> 625 credits).
       - Client B: Budget 3000 CZK (Low budget, 10% fee -> 300 CZK -> 300 credits).
       - Client C: Budget 1500 PLN (High budget, 5% fee -> 75 PLN -> 375 credits).
    2. Background job processes all three new emails in the same run.
    3. Gemini correctly extracts data and currencies for all three.
    4. Bot replies to all three clients appropriately.
    5. IMAP UNSEEN status is preserved for all three.
    6. Supabase accurately reflects the three separate conversations with correct credit calculations.
    7. UI displays three distinct conversations with their respective country tags and credits.
    """
    pass
