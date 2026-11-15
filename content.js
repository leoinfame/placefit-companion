// Captura somente o telefone quando o próprio WhatsApp o expõe na rota /send?phone=.
// Não lê mensagens, nomes, atributos do DOM nem tenta adivinhar identificadores LID.
let lastHref = location.href;

function publishContext() {
  const current = location.href;
  if (current === lastHref && document.visibilityState !== "visible") return;
  lastHref = current;

  let chatHint = null;
  try {
    const url = new URL(current);
    if (url.pathname.replace(/\/$/, "").endsWith("/send")) {
      const phone = url.searchParams.get("phone");
      if (phone && /^[+\d\s().-]{10,24}$/.test(phone)) chatHint = phone;
    }
  } catch (_) {
    // URL inválida: não publica identificador.
  }

  chrome.runtime.sendMessage({
    type: "PLACEFIT_CONTEXT",
    chatHint
  }).catch(() => {});
}

const observer = new MutationObserver(() => {
  if (location.href !== lastHref) publishContext();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("popstate", publishContext);
document.addEventListener("visibilitychange", publishContext);
publishContext();
