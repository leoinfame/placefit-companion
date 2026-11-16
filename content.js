// Detecta identificadores estruturais do chat ativo; nunca lê mensagens.
let lastContextKey = "";
let debounceTimer;

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

function identityFromJid(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  // O WhatsApp Web pode prefixar JIDs com true_/false_ e incluir
  // o identificador do dispositivo (:N). O LID também pode vir assim.
  const lid = raw.match(/(?:^|[^0-9])(?:true_|false_)?(\d{5,30})(?::\d+)?@lid(?:$|[^a-z])/i);
  if (lid) return { lid: lid[1] };

  const phone = raw.match(/(?:^|[^0-9])(?:true_|false_)?(\d{10,15})(?::\d+)?@(?:c\.us|s\.whatsapp\.net)(?:$|[^a-z])/i);
  if (phone) return { phone: phone[1] };
  return null;
}

function phoneFromText(value) {
  const text = String(value || "").replace(/[\u00a0\u202f]/g, " ");
  // Só tenta números apresentados no cabeçalho ativo ou painel de informações.
  const brazilian = text.match(/(?:\+?55[\s().-]*)?(?:\(?\d{2}\)?[\s().-]*)?(?:9?\d{4})[\s.-]?\d{4}/g) || [];
  for (const candidate of brazilian) {
    const phone = normalizePhone(candidate);
    if (phone && [10, 11, 12, 13].includes(phone.length)) return phone;
  }
  return null;
}

function identityFromAttributes(root, includeDescendants = true) {
  if (!root) return null;
  const selector = "[data-id], [data-jid], [data-chat-id], [title], [aria-label], [id]";
  const nodes = includeDescendants ? [root, ...root.querySelectorAll(selector)] : [root];
  for (const el of nodes) {
    for (const attr of ["data-id", "data-jid", "data-chat-id", "id"]) {
      const found = identityFromJid(el.getAttribute?.(attr));
      if (found) return found;
    }
    for (const attr of ["title", "aria-label"]) {
      const value = el.getAttribute?.(attr) || "";
      const found = identityFromJid(value);
      if (found) return found;
      const phone = phoneFromText(value);
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

  // Ancora a identidade no painel principal da conversa selecionada.
  // Não percorre a lista lateral de chats nem os elementos das mensagens.
  const main = document.querySelector("#main");
  if (main) {
    const fromMainAttributes = identityFromAttributes(main, false);
    if (fromMainAttributes) return fromMainAttributes;

    const headers = [
      ...main.querySelectorAll("header"),
      ...main.querySelectorAll('[data-testid="conversation-info-header"]'),
      ...main.querySelectorAll('[data-testid="conversation-header"]')
    ];
    for (const header of [...new Set(headers)]) {
      const fromAttributes = identityFromAttributes(header);
      if (fromAttributes) return fromAttributes;
      const fromVisibleHeader = phoneFromText(header.innerText || header.textContent);
      if (fromVisibleHeader) return { phone: fromVisibleHeader };
    }
  }

  // Fallback somente para painéis de informação do contato abertos pelo usuário.
  const infoPanels = document.querySelectorAll(
    '[data-testid="drawer-right"], [data-testid="contact-info-drawer"]'
  );
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

// Permite ao painel solicitar nova leitura sob demanda.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "PLACEFIT_FORCE_CONTEXT_REFRESH") return false;
  try {
    sendResponse({ ok: true, identity: extractChatIdentity() });
  } catch (error) {
    sendResponse({ ok: false, error: error?.message || "IDENTITY_READ_FAILED" });
  }
  return false;
});

function schedulePublish() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(publishContext, 180);
}

const observer = new MutationObserver(schedulePublish);
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["data-id", "data-jid", "data-chat-id", "title", "aria-label", "data-testid", "id"]
});
window.addEventListener("popstate", schedulePublish);
window.addEventListener("hashchange", schedulePublish);
document.addEventListener("visibilitychange", schedulePublish);
publishContext();
