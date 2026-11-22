# AI Product Studio — OpenAI integration

This adds a floating AI assistant to the existing site and routes requests through a Netlify Function. The OpenAI API key stays on the server.

## Files
- `ai-assistant.js` — floating chat interface.
- `netlify/functions/ai.mjs` — server-side OpenAI Responses API request.
- `netlify.toml` — preserves the existing `/api/ai` redirect and copies the chat script into the published site.
- `.env.example` — required environment-variable names with placeholders only.

## Netlify environment variables
Set these under Netlify → Site configuration → Environment variables:
- `OPENAI_API_KEY` — create a secret API key in the intended OpenAI project.
- `OPENAI_PROJECT_ID` — `proj_W2wVVddPCCSlaYljj379PGKO`.
- `OPENAI_MODEL` — defaults to `gpt-5-mini`; use a model enabled for this project.
- `AI_STUDIO_ACCESS_CODE` — a long private access phrase users must enter in the chat.

Then trigger a new Netlify deploy. The existing site is published from `dist`; the build now copies both `index.html` and `ai-assistant.js` there. The Netlify function is deployed from `netlify/functions`.

## Security and limits
- Never put the real API key in HTML, JavaScript, GitHub, or any public file.
- A project ID is an identifier, not an API key.
- API usage may incur charges under the selected OpenAI project.
- The shared access phrase is only a basic gate, not individual authentication or robust abuse protection. Add authentication and rate limiting before opening the assistant publicly.
- The live API request cannot be tested until the secret variables are configured in Netlify.
