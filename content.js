// Detecta identificadores estruturais do chat ativo; nunca lê mensagens.
let lastContextKey = "";
let debounceTimer;

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

function phoneFromText(value) {
  const text = String(value || "");
  // Procura telefone formatado ou sequência numérica longa no cabeçalho/painel.
  const candidates = text.match(/\+?\d[\d\s().-]{8,}\d/g) || [];
  for (const candidate of candidates) {
    const phone = normalizePhone(candidate);
    if (phone) return phone;
  }
  return null;
}

function identityFromAttributes(root) {
  if (!root) return null;
  const nodes = [root, ...root.querySelectorAll("[data-id], [data-jid], [data-chat-id], [title], [aria-label]")];
  for (const el of nodes) {
    for (const attr of ["data-id", "data-jid", "data-chat-id"]) {
      const raw = el.getAttribute?.(attr) || "";
      const phoneMatch = raw.match(/(?:^|[^\d])(\d{10,15})@c\.us$/i);
      if (phoneMatch) return { phone: phoneMatch[1] };
      const lidMatch = raw.match(/^(\d{5,30})@lid$/i);
      if (lidMatch) return { lid: lidMatch[1] };
    }
    for (const attr of ["title", "aria-label"]) {
      const phone = phoneFromText(el.getAttribute?.(attr));
      if (phone) return { phone };
    }
  }
  return null;
}

function extractChatIdentity() {
  const url = new URL(location.href);
  if (url.pathname.replace(/\/$/, "").endsWith("/send")) {
    const phone = normalizePhone(url.searchParams.get("phone"));
    if (phone) return { phone };
  }

  // O WhatsApp pode expor o número como texto/atributo acessível no cabeçalho.
  const headers = [
    ...document.querySelectorAll('header[role="banner"]'),
    ...document.querySelectorAll('[role="banner"]')
  ];
  for (const header of [...new Set(headers)]) {
    const fromAttributes = identityFromAttributes(header);
    if (fromAttributes) return fromAttributes;
    const fromVisibleHeader = phoneFromText(header.innerText || header.textContent);
    if (fromVisibleHeader) return { phone: fromVisibleHeader };
  }

  // Fallback: painel de informações do contato, se estiver aberto.
  // Não varre a lista de conversas nem o conteúdo das mensagens.
  const infoPanels = document.querySelectorAll('[role="dialog"], [role="complementary"], aside');
  for (const panel of infoPanels) {
    const fromAttributes = identityFromAttributes(panel);
    if (fromAttributes) return fromAttributes;
    const fromVisiblePanel = phoneFromText(panel.innerText || panel.textContent);
    if (fromVisiblePanel) return { phone: fromVisiblePanel };
  }
  return null;
}

function publishContext() {
  let identity = null;
  try { identity = extractChatIdentity(); } catch (_) {}
  const key = identity ? JSON.stringify(identity) : "";
  if (key === lastContextKey) return;
  lastContextKey = key;
  try {
    if (!chrome.runtime?.id) return;
    const pending = chrome.runtime.sendMessage({
      type: "PLACEFIT_CONTEXT",
      chatHint: identity?.phone || null,
      lidHint: identity?.lid || null,
      contextKey: key
    });
    pending?.catch?.(() => {});
  } catch (_) {
    // Reabra a aba do WhatsApp após recarregar a extensão.
  }
}

// Permite ao painel solicitar uma nova leitura sob demanda, sem depender do observer.\nchrome.runtime.onMessage.addListener((message, sender, sendResponse) => {\n  if (message?.type !== "PLACEFIT_FORCE_CONTEXT_REFRESH") return false;\n  try {\n    sendResponse({ ok: true, identity: extractChatIdentity() });\n  } catch (error) {\n    sendResponse({ ok: false, error: error?.message || "IDENTITY_READ_FAILED" });\n  }\n  return false;\n});\n\nfunction schedulePublish() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(publishContext, 180);
}

const observer = new MutationObserver(schedulePublish);
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["data-id", "data-jid", "data-chat-id", "title", "aria-label"]
});
window.addEventListener("popstate", schedulePublish);
window.addEventListener("hashchange", schedulePublish);
document.addEventListener("visibilitychange", schedulePublish);
publishContext();
