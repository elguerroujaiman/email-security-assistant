const express = require('express');
const net = require('net');
const app = express();
app.use(express.json({ limit: '50mb' }));

const SPAMD_HOST = process.env.SPAMD_HOST || 'spamassassin';
const SPAMD_PORT = parseInt(process.env.SPAMD_PORT || '783');

function checkSpam(rawEmail) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let data = Buffer.alloc(0);

    client.connect(SPAMD_PORT, SPAMD_HOST, () => {
      const header = `PROCESS SPAMC/1.5\r\nContent-length: ${Buffer.byteLength(rawEmail)}\r\nUser: spamd\r\n\r\n`;
      client.write(header);
      client.write(rawEmail);
      client.end();
    });

    client.on('data', (chunk) => { data = Buffer.concat([data, chunk]); });
    client.on('close', () => {
      const response = data.toString();
      const scoreMatch = response.match(/Spam:\s+(True|False)\s+;\s+(-?\d+\.?\d*)\s+\//);
      const score = scoreMatch ? parseFloat(scoreMatch[2]) : 0;
      const isSpam = scoreMatch ? scoreMatch[1] === 'True' : false;
      const rulesMatch = response.match(/tests=([^ ]*)/);
      const rules = rulesMatch ? rulesMatch[1].split(',') : [];

      resolve({
        score,
        is_spam: isSpam,
        threshold: 5.0,
        rules,
        raw_report: response,
        recommendation: score > 5 ? 'QUARANTINE' : score >= 2 ? 'REVIEW' : 'CLEAN'
      });
    });
    client.on('error', reject);
  });
}

app.post('/check', async (req, res) => {
  try {
    const { rawEmail } = req.body;
    if (!rawEmail) return res.status(400).json({ error: 'Missing rawEmail' });
    const result = await checkSpam(rawEmail);
    res.json(result);
  } catch (err) {
    console.error('SA Check Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', spamd: `${SPAMD_HOST}:${SPAMD_PORT}` }));

app.listen(3001, () => console.log('SA Wrapper running on port 3001'));
