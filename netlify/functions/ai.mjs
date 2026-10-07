export default async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), {
      status: 405,
      headers: { "content-type": "application/json" }
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: "AI gateway is not configured",
      code: "MISSING_OPENAI_API_KEY"
    }), {
      status: 503,
      headers: { "content-type": "application/json" }
    });
  }

  let body;
  try { body = await request.json(); }
  catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
  if (!messages.length) {
    return new Response(JSON.stringify({ error: "messages required" }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "authorization": "Bearer " + apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      input: messages,
      store: false
    })
  });

  const data = await response.json();
  if (!response.ok) {
    return new Response(JSON.stringify({
      error: "AI provider error",
      details: data?.error?.message || "Unknown provider error"
    }), {
      status: response.status,
      headers: { "content-type": "application/json" }
    });
  }

  return new Response(JSON.stringify({
    output_text: data.output_text || "",
    response_id: data.id || null
  }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
};
