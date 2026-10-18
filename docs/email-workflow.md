# Email workflow and integrations

## Flow

The exported n8n workflow in `../n8n-workflows/email-security-workflow.json` contains an IMAP email trigger, a call to the SpamAssassin wrapper, an AI classification request, a routing switch, and Gmail label actions for the resulting categories.

The SpamAssassin wrapper accepts a message over HTTP and communicates with the SpamAssassin service on the private Compose network. The email parser is a separate API for turning raw RFC 822 messages into structured email data; it is not called by the exported n8n workflow.

## Import and configure

1. Start the Compose stack and create the n8n owner account.
2. Import the workflow JSON from this repository.
3. Re-select credentials for each imported IMAP and Gmail node. Credential IDs in an export are references to the original n8n instance, not transferable secrets.
4. Verify the destination mailbox, labels, and routing conditions. Keep the workflow inactive while validating.
5. The AI node uses `http://ai-service:8000/classify`, which resolves inside the Compose network.

Do not store mailbox credentials or app passwords in the workflow export. Add credentials through n8n's credential manager.

## Local endpoints

- SpamAssassin wrapper: `http://localhost:3001`
- Email parser: `http://localhost:3002`
- SpamAssassin itself is reachable only inside the Compose network.
