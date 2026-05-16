require('dotenv').config();
const express = require('express');
const { handleMessage } = require('./botFlow');

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const PORT = process.env.PORT || 3000;

// Meta webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Webhook] Verified successfully.');
    return res.status(200).send(challenge);
  }

  console.warn('[Webhook] Verification failed. Token mismatch.');
  res.sendStatus(403);
});

// Incoming message handler
app.post('/webhook', async (req, res) => {
  // Acknowledge immediately so Meta doesn't retry
  res.sendStatus(200);

  const body = req.body;

  if (body.object !== 'whatsapp_business_account') return;

  const entry = body.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const messages = value?.messages;

  if (!messages || messages.length === 0) return;

  const message = messages[0];
  const from = message.from;
  const text = message.text?.body;

  if (!from || !text) return;

  console.log(`[Webhook] Message from ${from}: ${text}`);

  try {
    await handleMessage(from, text);
  } catch (err) {
    console.error('[Webhook] Unhandled error in handleMessage:', err.message);
  }
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
});
