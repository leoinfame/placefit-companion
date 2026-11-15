// PlaceFit Companion — service worker (Manifest V3)
// Configure API_BASE somente após aprovar o fluxo autenticado Base44.
const API_BASE = "";

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "PLACEFIT_CONTEXT") {
    // URL/DOM são pistas não confiáveis, nunca autorização.
    chrome.storage.session.set({
      activeContext: {
        url: sender.tab?.url || "",
        chatHint: message.chatHint || null,
        capturedAt: Date.now()
      }
    }).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message?.type === "PLACEFIT_API_REQUEST") {
    sendResponse({ ok: false, error: "API_NOT_CONFIGURED" });
    return false;
  }
});