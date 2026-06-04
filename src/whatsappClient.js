const path = require('path');

async function sendText(sock, jid, text) {
  try {
    await sock.sendMessage(jid, { text });
  } catch (err) {
    console.error('[WhatsApp] sendText failed:', err.message);
    throw err;
  }
}

async function sendImage(sock, jid, url, caption = '') {
  try {
    await sock.sendMessage(jid, { image: { url }, caption });
  } catch (err) {
    console.error('[WhatsApp] sendImage failed:', err.message);
    throw err;
  }
}

async function sendVideo(sock, jid, url, caption = '') {
  try {
    await sock.sendMessage(jid, { video: { url }, caption });
  } catch (err) {
    console.error('[WhatsApp] sendVideo failed:', err.message);
    throw err;
  }
}

async function sendDocument(sock, jid, url, fileName = 'brochure.pdf') {
  try {
    const ext = path.extname(fileName).toLowerCase();
    const mimetype = ext === '.pdf' ? 'application/pdf' : 'application/octet-stream';
    await sock.sendMessage(jid, { document: { url }, mimetype, fileName });
  } catch (err) {
    console.error('[WhatsApp] sendDocument failed:', err.message);
    throw err;
  }
}

module.exports = { sendText, sendImage, sendVideo, sendDocument };
