# Iteration 1 Review Feedback
The previous implementation satisfied the basic requirements but was VETOED by Reviewers due to the following critical flaws:

1. **State Inconsistency (Lost Leads)**: The `Message-ID` is appended to `processed_message_ids` before the Gemini API call. If Gemini fails or times out, the message is marked processed but the lead is not actually handled. This permanently drops the email. Deduplication updates must happen at the end of successful processing.
2. **Infinite Loop (Missing Message-ID)**: If an incoming email lacks a `Message-ID` header, the deduplication logic fails. Because the email remains `UNSEEN`, it will be fetched infinitely every 60 seconds. A fallback synthetic ID must be generated.
3. **Bandwidth Exhaustion**: The IMAP fetch loop grabs the entire email body (`BODY.PEEK[]`) for every `UNSEEN` message before checking if it's already processed. It should first fetch only headers, check `processed_message_ids`, and only fetch the body if it's a new message.
