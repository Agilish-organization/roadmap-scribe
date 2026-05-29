class LLMError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'LLMError';
    this.status = status;
  }
}

const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'google/gemini-2.0-flash-001';

/**
 * Build the system prompt that tells the LLM what to produce.
 * Returns JSON with { roadmap, tickets } structure.
 */
function buildPrompt(transcript) {
  return `You are an AI product meeting scribe. Given a raw meeting transcript, produce two structured outputs:

1. A **Product Roadmap** — organized by themes/initiatives with timeline estimates (e.g., "Q2 2025", "Next 30 days"). Include a brief summary of the discussion.
2. A set of **Jira-style tickets** — each with summary, type (Epic / Story / Task / Bug), priority (High / Medium / Low), and a brief description.

Output ONLY valid JSON with this exact structure — no markdown fences, no commentary:

{
  "roadmap": {
    "summary": "Brief summary of what was discussed",
    "initiatives": [
      {
        "theme": "Theme name",
        "timeline": "Q2 2025",
        "description": "What we're building and why"
      }
    ]
  },
  "tickets": [
    {
      "key": "PROJ-1",
      "summary": "Ticket title",
      "type": "Story",
      "priority": "High",
      "description": "Ticket description with acceptance criteria"
    }
  ]
}

Here is the transcript:
---
${transcript}
---`;
}

/**
 * Call OpenRouter with the transcript and parse the response.
 * Throws LLMError on any failure.
 */
async function generateFromTranscript(transcript) {
  if (!API_KEY) {
    throw new LLMError('OPENROUTER_API_KEY is not configured. Set it in .env.');
  }

  let response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are a precise JSON generator. Output only valid JSON matching the requested schema. No markdown fences.' },
          { role: 'user', content: buildPrompt(transcript) },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });
  } catch (err) {
    throw new LLMError(`Failed to reach OpenRouter: ${err.message}`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '(no body)');
    throw new LLMError(`OpenRouter returned ${response.status}: ${body}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new LLMError('LLM returned empty response — no content in output.');
  }

  // Parse JSON — strip any accidental markdown fences
  let parsed;
  try {
    const cleaned = content.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new LLMError(`LLM output was not valid JSON: ${err.message}`);
  }

  // Validate structure
  if (!parsed.roadmap || !parsed.tickets) {
    throw new LLMError('LLM output missing required fields (roadmap or tickets).');
  }

  return parsed;
}

module.exports = { generateFromTranscript, LLMError };