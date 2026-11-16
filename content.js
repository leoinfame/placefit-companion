// Detecta somente identificadores estruturais do chat ativo; nunca lê mensagens.
let lastContextKey = "";
let debounceTimer;

function extractChatIdentity() {
  const url = new URL(location.href);
  if (url.pathname.replace(/\/$/, "").endsWith("/send")) {
    const phone = url.searchParams.get("phone");
    if (phone && /^[+\d\s().-]{10,24}$/.test(phone)) return { phone };
  }

  // O WhatsApp usa IDs estruturais no cabeçalho ativo. Só aceitamos
  // formatos conhecidos: número @c.us ou LID @lid. Nome não é chave.
  const header = document.querySelector('[data-testid="conversation-info-header"], header');
  if (header) {
    const nodes = [header, ...header.querySelectorAll("[data-id], [data-jid], [data-chat-id]")];
    for (const el of nodes) {
      for (const attr of ["data-id", "data-jid", "data-chat-id"]) {
        const raw = el.getAttribute?.(attr) || "";
        const phoneMatch = raw.match(/(?:^|[^\d])(\d{10,15})@c\.us$/i);
        if (phoneMatch) return { phone: phoneMatch[1] };
        const lidMatch = raw.match(/^(\d{5,30})@lid$/i);
        if (lidMatch) return { lid: lidMatch[1] };
      }
    }
  }
  return null;
}

function publishContext() {
  let identity = null;
  try { identity = extractChatIdentity(); } catch (_) {}
  const key = identity ? JSON.stringify(identity) : "";
  if (key === lastContextKey) return;
  lastContextKey = key;
  chrome.runtime.sendMessage({
    type: "PLACEFIT_CONTEXT",
    chatHint: identity?.phone || null,
    lidHint: identity?.lid || null,
    contextKey: key
  }).catch(() => {});
}

function schedulePublish() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(publishContext, 180);
}

const observer = new MutationObserver(schedulePublish);
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-id", "data-jid", "data-chat-id"] });
window.addEventListener("popstate", schedulePublish);
window.addEventListener("hashchange", schedulePublish);
document.addEventListener("visibilitychange", schedulePublish);
publishContext();
