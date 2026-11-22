(() => {
  if (document.getElementById("aps-ai-launcher")) return;
  const style = document.createElement("style");
  style.textContent = [
    "#aps-ai-launcher{position:fixed;right:24px;bottom:24px;z-index:9998;border:0;border-radius:999px;padding:15px 20px;background:linear-gradient(135deg,#66e8ff,#7d8dff);color:#06151c;font:700 14px system-ui;box-shadow:0 10px 35px #0008;cursor:pointer}",
    "#aps-ai-panel{position:fixed;right:24px;bottom:88px;z-index:9999;width:min(410px,calc(100vw - 28px));height:min(610px,calc(100vh - 120px));display:none;grid-template-rows:auto auto 1fr auto auto;overflow:hidden;border:1px solid #31505f;border-radius:22px;background:#08131df2;color:#edf6ff;box-shadow:0 24px 80px #000a;font:14px system-ui;backdrop-filter:blur(18px)}",
    "#aps-ai-panel.open{display:grid}#aps-ai-panel *{box-sizing:border-box}",
    ".aps-ai-head{display:flex;align-items:center;justify-content:space-between;padding:17px 18px;border-bottom:1px solid #ffffff20}",
    ".aps-ai-head small{display:block;margin-top:3px;color:#9ab0bf;font-size:11px}",
    "#aps-ai-close{border:1px solid #ffffff30;border-radius:50%;width:32px;height:32px;background:transparent;color:#fff;font-size:20px;cursor:pointer}",
    ".aps-ai-access{display:flex;gap:8px;padding:12px 14px;border-bottom:1px solid #ffffff18}",
    ".aps-ai-access input,.aps-ai-input{min-width:0;width:100%;border:1px solid #ffffff2b;border-radius:10px;padding:11px;background:#0d1e2a;color:#fff;font:inherit;outline:none}",
    ".aps-ai-messages{overflow:auto;padding:16px;display:flex;flex-direction:column;gap:12px}",
    ".aps-ai-msg{max-width:92%;padding:11px 13px;border-radius:14px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}",
    ".aps-ai-msg.user{align-self:flex-end;background:#173d4d;border:1px solid #66e8ff55}.aps-ai-msg.assistant{align-self:flex-start;background:#111f2b;border:1px solid #ffffff1b}",
    ".aps-ai-compose{display:grid;grid-template-columns:1fr auto;gap:8px;padding:12px 14px;border-top:1px solid #ffffff20}",
    ".aps-ai-compose textarea{resize:vertical;min-height:46px;max-height:120px}",
    ".aps-ai-send{border:0;border-radius:11px;padding:0 16px;background:linear-gradient(135deg,#66e8ff,#7d8dff);color:#06151c;font-weight:800;cursor:pointer}",
    ".aps-ai-send:disabled{opacity:.5;cursor:wait}.aps-ai-foot{padding:0 15px 12px;color:#8295a2;font-size:10px}",
    "@media(max-width:520px){#aps-ai-launcher{right:14px;bottom:14px}#aps-ai-panel{right:8px;bottom:72px;width:calc(100vw - 16px);height:calc(100vh - 90px)}}"
  ].join("");
  document.head.appendChild(style);
  const launcher = document.createElement("button");
  launcher.id = "aps-ai-launcher";
  launcher.type = "button";
  launcher.textContent = "✦ AI Studio";
  launcher.setAttribute("aria-label", "Открыть AI-ассистента");
  const panel = document.createElement("section");
  panel.id = "aps-ai-panel";
  panel.setAttribute("aria-label", "AI Product Studio — ассистент");
  panel.innerHTML = '<header class="aps-ai-head"><div><strong>AI Product Assistant</strong><small>Поддержка идей, продуктов и прототипов</small></div><button id="aps-ai-close" type="button" aria-label="Закрыть">×</button></header><div class="aps-ai-access"><input id="aps-ai-code" type="password" autocomplete="off" placeholder="Код доступа к AI" aria-label="Код доступа"></div><div class="aps-ai-messages" id="aps-ai-messages" aria-live="polite"><div class="aps-ai-msg assistant">Привет! Я ИИ-ассистент AI Product Studio. Опишите идею — помогу превратить её в концепцию, MVP, интерфейс или техническое задание.</div></div><form class="aps-ai-compose" id="aps-ai-form"><textarea class="aps-ai-input" id="aps-ai-input" maxlength="4000" placeholder="Напишите сообщение…" aria-label="Ваше сообщение" required></textarea><button class="aps-ai-send" id="aps-ai-send" type="submit">Отправить</button></form><div class="aps-ai-foot" id="aps-ai-status">Защищённое серверное подключение. API-ключ не передаётся браузеру.</div>';
  document.body.append(launcher, panel);
  const messagesEl = panel.querySelector("#aps-ai-messages");
  const inputEl = panel.querySelector("#aps-ai-input");
  const codeEl = panel.querySelector("#aps-ai-code");
  const form = panel.querySelector("#aps-ai-form");
  const send = panel.querySelector("#aps-ai-send");
  const status = panel.querySelector("#aps-ai-status");
  const history = [];
  function addMessage(role, text) {
    const node = document.createElement("div");
    node.className = "aps-ai-msg " + role;
    node.textContent = text;
    messagesEl.appendChild(node);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  launcher.addEventListener("click", () => panel.classList.toggle("open"));
  panel.querySelector("#aps-ai-close").addEventListener("click", () => panel.classList.remove("open"));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = inputEl.value.trim();
    if (!message || send.disabled) return;
    if (!codeEl.value.trim()) {
      status.textContent = "Введите код доступа, заданный в настройках Netlify.";
      codeEl.focus();
      return;
    }
    addMessage("user", message);
    history.push({ role: "user", content: message });
    inputEl.value = "";
    send.disabled = true;
    status.textContent = "ИИ формирует ответ…";
    try {
      const response = await fetch("/.netlify/functions/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-12), accessCode: codeEl.value })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Ошибка сервера (" + response.status + ")");
      if (!data.reply) throw new Error("Сервер вернул пустой ответ.");
      history.push({ role: "assistant", content: data.reply });
      addMessage("assistant", data.reply);
      status.textContent = "Готов к следующему запросу.";
    } catch (error) {
      if (history.length && history[history.length - 1].role === "user") history.pop();
      addMessage("assistant", "Не удалось получить ответ: " + error.message);
      status.textContent = "Проверьте настройки API и код доступа в Netlify.";
    } finally {
      send.disabled = false;
      inputEl.focus();
    }
  });
})();