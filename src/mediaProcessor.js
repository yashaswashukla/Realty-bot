const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const PROCESSED_DIR = path.join(__dirname, '..', 'media', 'processed');

function ensureProcessedDir() {
  if (!fs.existsSync(PROCESSED_DIR)) {
    fs.mkdirSync(PROCESSED_DIR, { recursive: true });
  }
}

async function overlayImageText(inputPath, outputFileName, name, contactNumber) {
  ensureProcessedDir();
  const outputPath = path.join(PROCESSED_DIR, outputFileName);
  const overlayText = `To know more, please contact ${name} at ${contactNumber}`;

  const image = sharp(inputPath);
  const metadata = await image.metadata();
  const { width, height } = metadata;

  const padding = 40;
  const availableWidth = width - padding * 2;
  const fontSize = Math.max(16, Math.min(32, Math.floor(width / 25)));
  const charWidth = fontSize * 0.55;
  const charsPerLine = Math.floor(availableWidth / charWidth);

  // Word-wrap into lines
  const words = overlayText.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length <= charsPerLine) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  const lineHeight = fontSize * 1.5;
  const blockHeight = lines.length * lineHeight;
  const startY = height - blockHeight - padding;

  const textElements = lines.map((line, i) => `
    <text
      x="${width / 2}"
      y="${startY + i * lineHeight + fontSize}"
      font-family="Arial, sans-serif"
      font-size="${fontSize}"
      font-weight="bold"
      fill="white"
      text-anchor="middle"
    >${escapeXml(line)}</text>
  `).join('');

  const svgOverlay = `<svg width="${width}" height="${height}">${textElements}</svg>`;

  await image
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .toFile(outputPath);

  return outputPath;
}

function overlayVideoText(inputPath, outputFileName, name, contactNumber) {
  ensureProcessedDir();
  return new Promise((resolve, reject) => {
    const outputPath = path.join(PROCESSED_DIR, outputFileName);
    const overlayText = `To know more, please contact ${name} at ${contactNumber}`;
    const escapedText = overlayText.replace(/'/g, "\\'").replace(/:/g, '\\:');

    ffmpeg(inputPath)
      .videoFilters([
        {
          filter: 'drawtext',
          options: {
            text: escapedText,
            fontsize: 20,
            fontcolor: 'white',
            x: '(w-text_w)/2',
            y: 'h-th-20',
            box: 1,
            boxcolor: 'black@0.6',
            boxborderw: 8,
          },
        },
      ])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => {
        console.error('[ffmpeg] Error:', err.message);
        reject(err);
      })
      .run();
  });
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = { overlayImageText, overlayVideoText };
