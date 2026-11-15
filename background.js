const API_BASE = "https://app.placefit.com.br/functions/crm-companion";
const APP_ID = "68c9d5dd3cf0f8fd8a834875";
const TRUSTED_ORIGINS = new Set(["https://app.placefit.com.br","https://placefit.base44.app"]);

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true}).catch(console.error);
});

chrome.runtime.onMessageExternal.addListener((message,sender,sendResponse) => {
  let origin = "";
  try { origin = new URL(sender.url || "").origin; } catch (_) {}
  if (!TRUSTED_ORIGINS.has(origin)) { sendResponse({ok:false,error:"ORIGIN_NOT_ALLOWED"}); return false; }
  if (message?.type !== "PLACEFIT_AUTH_COMPLETE" || typeof message.token !== "string" || message.token.length < 20) {
    sendResponse({ok:false,error:"INVALID_AUTH_MESSAGE"}); return false;
  }
  chrome.storage.session.set({authToken:message.token}).then(()=>sendResponse({ok:true})).catch(()=>sendResponse({ok:false,error:"SESSION_STORAGE_FAILED"}));
  return true;
});

chrome.runtime.onMessage.addListener((message,sender,sendResponse) => {
  if (message?.type === "PLACEFIT_CONTEXT") {
    chrome.storage.session.set({activeContext:{url:sender.tab?.url||"",chatHint:message.chatHint||null,capturedAt:Date.now()}})
      .then(()=>sendResponse({ok:true}));
    return true;
  }
  if (message?.type === "PLACEFIT_OPEN_AUTH") {
    const url = "https://app.placefit.com.br/CompanionAuth?extensionId=" + encodeURIComponent(chrome.runtime.id);
    chrome.tabs.create({url}).then(()=>sendResponse({ok:true}));
    return true;
  }
  if (message?.type === "PLACEFIT_LOGOUT") {
    chrome.storage.session.remove(["authToken"]).then(()=>sendResponse({ok:true}));
    return true;
  }
  if (message?.type === "PLACEFIT_API_REQUEST") {
    (async()=>{
      const {authToken}=await chrome.storage.session.get("authToken");
      if(!authToken){sendResponse({ok:false,status:401,error:"AUTH_REQUIRED"});return;}
      const response=await fetch(API_BASE,{method:"POST",headers:{"Content-Type":"application/json","X-App-Id":APP_ID,"Authorization":"Bearer "+authToken},body:JSON.stringify(message.payload||{})});
      const data=await response.json().catch(()=>({}));
      if(response.status===401) await chrome.storage.session.remove(["authToken"]);
      sendResponse({ok:response.ok,status:response.status,data});
    })().catch(e=>sendResponse({ok:false,error:e?.message||"NETWORK_ERROR"}));
    return true;
  }
});