const express = require('express');
const router = express.Router();
const { generateFromTranscript } = require('../lib/llm');

router.post('/generate', async (req, res) => {
  const { transcript } = req.body;

  // Input validation
  if (transcript === undefined || transcript === null) {
    return res.status(400).json({ error: 'Missing "transcript" field in request body.' });
  }
  if (typeof transcript !== 'string') {
    return res.status(400).json({ error: '"transcript" must be a string.' });
  }
  if (transcript.trim().length === 0) {
    return res.status(400).json({ error: 'Transcript is empty.' });
  }
  if (transcript.trim().length < 50) {
    return res.status(400).json({ error: 'Transcript is too short (< 50 chars). Provide a full meeting transcript.' });
  }

  try {
    const result = await generateFromTranscript(transcript.trim());
    return res.json(result);
  } catch (err) {
    // LLM or upstream failures surface as 502
    if (err.name === 'LLMError') {
      return res.status(502).json({ error: err.message });
    }
    // Unknown errors
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;