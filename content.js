// Ponte mínima de contexto. Não coleta corpo de mensagens nem dados do contato.
// DOM/URL do WhatsApp são instáveis; o valor é apenas uma pista visual.
let lastHref = location.href;

function publishContext() {
  const current = location.href;
  if (current === lastHref && document.visibilityState !== "visible") return;
  lastHref = current;
  chrome.runtime.sendMessage({
    type: "PLACEFIT_CONTEXT",
    chatHint: current.includes("/send?phone=")
      ? new URL(current).searchParams.get("phone")
      : null
  }).catch(() => {});
}

const observer = new MutationObserver(() => {
  if (location.href !== lastHref) publishContext();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("popstate", publishContext);
document.addEventListener("visibilitychange", publishContext);
publishContext();