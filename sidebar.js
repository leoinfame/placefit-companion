const contextEl = document.getElementById("context");

async function refresh() {
  const { activeContext } = await chrome.storage.session.get("activeContext");
  if (!activeContext) {
    contextEl.textContent = "Abra uma conversa no WhatsApp Web.";
    return;
  }
  const hint = activeContext.chatHint;
  contextEl.textContent = hint
    ? `Número detectado na URL: ${hint}. Ainda não validado pelo CRM.`
    : "Conversa aberta detectada. Identificação do contato pendente de validação.";
}
refresh();
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "session" && changes.activeContext) refresh();
});