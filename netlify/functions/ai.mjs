const PROJECT_ID = process.env.OPENAI_PROJECT_ID || "proj_W2wVVddPCCSlaYljj379PGKO";
const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 4000;

export default async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers() });
  if (request.method !== "POST") return json({ error: "Метод не поддерживается." }, 405);

  const apiKey = process.env.OPENAI_API_KEY;
  const accessCode = process.env.AI_STUDIO_ACCESS_CODE;
  if (!apiKey || !accessCode) {
    return json({ error: "Сервер не настроен: добавьте OPENAI_API_KEY и AI_STUDIO_ACCESS_CODE в переменные Netlify." }, 503);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Некорректный JSON-запрос." }, 400); }

  if (!body || typeof body.accessCode !== "string" || body.accessCode !== accessCode) {
    return json({ error: "Неверный код доступа." }, 401);
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
    return json({ error: "Передайте от 1 до " + MAX_MESSAGES + " сообщений." }, 400);
  }

  const messages = [];
  for (const item of body.messages) {
    if (!item || !["user", "assistant"].includes(item.role) ||
        typeof item.content !== "string" || item.content.trim().length === 0 ||
        item.content.length > MAX_MESSAGE_LENGTH) {
      return json({ error: "Сообщение имеет неверный формат или превышает лимит 4000 символов." }, 400);
    }
    messages.push({ role: item.role, content: item.content.trim() });
  }
  if (messages[messages.length - 1].role !== "user") {
    return json({ error: "Последнее сообщение должно быть от пользователя." }, 400);
  }

  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json",
        "OpenAI-Project": PROJECT_ID
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
        instructions: [
          "Ты — ИИ-ассистент AI Product Studio.",
          "Отвечай на русском языке, если пользователь не попросил другой язык.",
          "Помогай разрабатывать цифровые продукты: идеи, продуктовые концепции, MVP, UX/UI, архитектуру, технические задания и код.",
          "Будь практичным, структурированным и честным. Не утверждай, что выполнил внешнее действие, если оно не было выполнено."
        ].join(" "),
        input: messages,
        store: false,
        max_output_tokens: 1200
      })
    });

    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const status = upstream.status;
      const detail = result?.error?.message || "OpenAI API вернул статус " + status + ".";
      console.error("OpenAI API error:", status, detail);
      if (status === 401) return json({ error: "OpenAI не принял API-ключ. Проверьте ключ проекта." }, 502);
      if (status === 429) return json({ error: "Превышен лимит запросов или недостаточно средств/квоты API." }, 429);
      return json({ error: "Ошибка OpenAI API. Проверьте настройки проекта и доступность выбранной модели." }, 502);
    }

    const reply = (result.output || [])
      .filter((item) => item.type === "message")
      .flatMap((item) => item.content || [])
      .filter((part) => part.type === "output_text")
      .map((part) => part.text)
      .join("\n")
      .trim();
    if (!reply) return json({ error: "Модель не вернула текстовый ответ." }, 502);
    return json({ reply });
  } catch (error) {
    console.error("AI function failure:", error);
    return json({ error: "Не удалось связаться с OpenAI. Повторите попытку позже." }, 502);
  }
};

function headers() {
  return {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8"
  };
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: headers() });
}
