const express = require('express');
const simpleParser = require('mailparser').simpleParser;
const crypto = require('crypto');
const app = express();
app.use(express.json({ limit: '50mb' }));

app.post('/parse', async (req, res) => {
  try {
    const { rawEmail } = req.body;
    if (!rawEmail) return res.status(400).json({ error: 'Missing rawEmail' });

    const parsed = await simpleParser(rawEmail);

    const combined = (parsed.text || '') + ' ' + (parsed.html || '');
    const urlMatches = combined.match(/https?:\/\/[^\s<>\"{}|\\^`\[\]]+/g) || [];
    const uniqueUrls = [...new Set(urlMatches)];

    const links = uniqueUrls.map(url => {
      try {
        const u = new URL(url);
        return {
          url,
          domain: u.hostname,
          is_shortened: /bit\.ly|t\.co|tinyurl|ow\.ly|short\.link/.test(u.hostname)
        };
      } catch(e) {
        return null;
      }
    }).filter(Boolean);

    const attachments = (parsed.attachments || []).map(att => ({
      filename: att.filename || 'unnamed',
      mime_type: att.contentType,
      size_bytes: att.size || 0,
      content_base64: att.content ? att.content.toString('base64') : '',
      hash_sha256: att.content ? crypto.createHash('sha256').update(att.content).digest('hex') : ''
    }));

    res.json({
      email_id: parsed.messageId || crypto.randomUUID(),
      timestamp: parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString(),
      subject: parsed.subject || '(no subject)',
      from: parsed.from?.value?.[0]?.address || parsed.from?.text || 'unknown',
      to: parsed.to?.value?.map(v => v.address) || [],
      cc: parsed.cc?.value?.map(v => v.address) || [],
      reply_to: parsed.replyTo?.value?.[0]?.address || null,
      headers: parsed.headers,
      body_text: parsed.text || '',
      body_html: parsed.html || '',
      attachments,
      links,
      raw_rfc822: rawEmail
    });
  } catch (err) {
    console.error('Parse Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(3002, () => console.log('Email Parser running on port 3002'));
