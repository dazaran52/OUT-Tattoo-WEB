"""
Empirical test to demonstrate the transient failure data loss vulnerability.
Run this to see how early appending of processed_message_ids causes dropped emails.
"""

# 1. State before processing
collected_data = {"processed_message_ids": []}
original_msg_id = "<valid-123@example.com>"

# 2. worker's code: Early commit to avoid concurrency issues
if original_msg_id and original_msg_id not in collected_data["processed_message_ids"]:
    collected_data["processed_message_ids"].append(original_msg_id)
    print("Database UPDATE: Saved original_msg_id to processed_message_ids.")

# 3. Simulated transient failure (e.g. Gemini API timeout, network error)
gemini_success = False
if not gemini_success:
    print("Error: Failed to get AI response. Returning early...")
    # The actual function `return`s here.
    
# 4. Next poll iteration (60 seconds later)
# The email is still UNSEEN in IMAP, so it is picked up again.
fetched_msg_id = "<valid-123@example.com>"
if fetched_msg_id in collected_data["processed_message_ids"]:
    print("Next poll: Skipping already processed message (header check).")

print("\nResult: The email is skipped forever. No reply was ever sent to the client. DATA LOSS.")
