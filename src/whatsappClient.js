require('dotenv').config();
const axios = require('axios');

const BASE_URL = `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`;

const headers = () => ({
  Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
  'Content-Type': 'application/json',
});

async function sendText(to, body) {
  try {
    await axios.post(
      BASE_URL,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      },
      { headers: headers() }
    );
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    console.error(`[WhatsApp] sendText failed (${status}):`, JSON.stringify(data));
    throw err;
  }
}

async function sendMedia(to, mediaType, link, caption = '') {
  try {
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: mediaType,
      [mediaType]: { link, caption },
    };

    await axios.post(BASE_URL, payload, { headers: headers() });
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    console.error(`[WhatsApp] sendMedia failed (${status}):`, JSON.stringify(data));
    throw err;
  }
}

async function sendDocument(to, link, fileName = 'brochure.pdf') {
  try {
    await axios.post(
      BASE_URL,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'document',
        document: { link, filename: fileName },
      },
      { headers: headers() }
    );
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    console.error(`[WhatsApp] sendDocument failed (${status}):`, JSON.stringify(data));
    throw err;
  }
}

module.exports = { sendText, sendMedia, sendDocument };
