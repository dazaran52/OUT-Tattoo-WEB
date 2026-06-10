import json

def test_pause_logic_snippet():
    # Setup
    sender_email = "test@example.com"
    msg_id = "<123@mock>"
    client_conversations = {
        sender_email: [
            {
                "id": "conv-1",
                "client_email": sender_email,
                "is_paused": True,
                "state": "active",
                "collected_data": {}
            }
        ]
    }
    
    skip_email = False
    client_convs = client_conversations.get(sender_email, [])
    
    updates = []
    class MockTable:
        def update(self, data):
            updates.append(data)
            return self
        def eq(self, field, value):
            return self
        def execute(self):
            pass
            
    class MockSupabase:
        def table(self, name):
            return MockTable()
            
    supabase = MockSupabase()
    
    # 1. Process Message loop mock
    for conv in client_convs:
        if msg_id in (conv.get("collected_data") or {}).get("processed_message_ids", []):
            skip_email = True
            break
            
    if not skip_email:
        for conv in client_convs:
            if conv.get("state") in ["initiated", "active"] and conv.get("is_paused"):
                collected = conv.get("collected_data") or {}
                if msg_id not in collected.get("processed_message_ids", []):
                    processed = collected.get("processed_message_ids", [])
                    processed.append(msg_id)
                    collected["processed_message_ids"] = processed
                    conv["collected_data"] = collected
                    try:
                        supabase.table("email_lead_conversations").update({"collected_data": collected}).eq("id", conv["id"]).execute()
                    except Exception as e:
                        print("Error")
                skip_email = True
                break

    # Verify
    assert skip_email == True, "Email was not skipped!"
    assert updates == [{"collected_data": {"processed_message_ids": ["<123@mock>"]}}], f"Updates incorrect: {updates}"
    print("Test passed: Pause logic properly updates processed_message_ids and skips.")

if __name__ == "__main__":
    test_pause_logic_snippet()
