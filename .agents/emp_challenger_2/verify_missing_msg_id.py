"""
Empirical test to demonstrate the missing Message-ID infinite loop vulnerability.
Run this to see how the logic fails when an email lacks a Message-ID.
"""

import email

# Simulated incoming email without a Message-ID header
raw_headers = b"From: sneaky_client@example.com\r\nSubject: Help me\r\n\r\n"

# 1. Simulate check_lead_emails parsing headers
msg_header = email.message_from_bytes(raw_headers)
msg_id = msg_header.get("Message-ID", None)
print(f"Extracted msg_id: {msg_id}")

# 2. Simulate processed_ids check
processed_ids = set()
if msg_id and msg_id in processed_ids:
    print("Skipped already processed message.")
else:
    print("Did NOT skip message. Proceeding to process_lead_email...")

# 3. Simulate process_lead_email appending to processed_message_ids
collected_data = {"processed_message_ids": []}
original_msg_id = msg_id  # Passed to process_lead_email

if original_msg_id and original_msg_id not in collected_data["processed_message_ids"]:
    collected_data["processed_message_ids"].append(original_msg_id)
    print("Added msg_id to database.")
else:
    print("Failed to add msg_id to database because original_msg_id is None.")

print("\nResult: The email remains UNSEEN, is not recorded as processed, and WILL trigger an AI reply again on the next 60s poll.")
