import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const originalFetch = global.fetch;

const loadAiHandler = async () => {
  const moduleUrl = new URL('../netlify/functions/ai.mjs', import.meta.url);
  return import(`${moduleUrl.href}?t=${Date.now()}`);
};

test('AI function extracts text from OpenAI Responses API output', async () => {
  process.env.OPENAI_API_KEY = 'test-key';
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      id: 'resp_123',
      output: [
        {
          type: 'message',
          content: [
            { type: 'output_text', text: 'Привет! Это ответ AI.' }
          ]
        }
      ]
    })
  });

  try {
    const { default: handler } = await loadAiHandler();
    const response = await handler({
      method: 'POST',
      async json() {
        return { messages: [{ role: 'user', content: 'Привет' }] };
      }
    });

    const data = await response.json();
    assert.equal(data.output_text, 'Привет! Это ответ AI.');
    assert.equal(data.response_id, 'resp_123');
  } finally {
    global.fetch = originalFetch;
  }
});

test('voice presets define oscillator type explicitly', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /classic:\s*\{[\s\S]*oscillator:\s*"sine"/);
  assert.match(html, /android:\s*\{[\s\S]*oscillator:\s*"square"/);
  assert.match(html, /deep:\s*\{[\s\S]*oscillator:\s*"triangle"/);
  assert.match(html, /radio:\s*\{[\s\S]*oscillator:\s*"sawtooth"/);
});
