const contextEl=document.getElementById("context");
const resultEl=document.getElementById("result");
const statusEl=document.getElementById("status");
const authMessage=document.getElementById("auth-message");
const connectBtn=document.getElementById("connect");
const logoutBtn=document.getElementById("logout");
const lookupPhone=document.getElementById("lookup-phone");
const lookupBtn=document.getElementById("lookup-button");
let currentRecord=null;
let lastLookupKey="";

function showAuth(connected,message){
  statusEl.textContent=connected?"CONECTADO":"DESCONECTADO";
  statusEl.classList.toggle("online",connected);
  authMessage.textContent=message;
  connectBtn.classList.toggle("hidden",connected);
  logoutBtn.classList.toggle("hidden",!connected);
}
async function api(payload){
  return chrome.runtime.sendMessage({type:"PLACEFIT_API_REQUEST",payload});
}
function node(tag,attrs={},text){
  const n=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k==="class") n.className=v;
    else if(k==="type"||k==="name"||k==="placeholder"||k==="maxlength"||k==="rows"||k==="value") n.setAttribute(k,String(v));
    else if(k==="disabled") n.disabled=Boolean(v);
  }
  if(text!==undefined)n.textContent=text;
  return n;
}
function addField(parent,labelText,name,value,options={}){
  const wrap=node("label",{class:"edit-field"});
  wrap.append(node("span",{},labelText));
  const input=options.multiline?node("textarea",{name,rows:options.rows||3, maxlength:options.maxlength||5000}):node("input",{name,type:options.type||"text",maxlength:options.maxlength||500});
  input.value=value||"";
  wrap.append(input);
  parent.append(wrap);
  return input;
}
function statusLine(text,isError=false){
  const p=node("p",{class:isError?"notice error":"notice"},text);
  resultEl.append(p);
}
function renderMatched(data){
  currentRecord=data;
  resultEl.replaceChildren();
  const c=data.conversation, customer=data.customer;
  resultEl.append(node("h3",{},c.nome_contato||"Contato localizado"));
  resultEl.append(node("p",{class:"muted"},"Correspondência por "+(data.matched_by==="lid"?"identificador WhatsApp associado":"telefone")+" · etapa: "+(c.etapa||"novo")));
  const form=node("form",{class:"edit-form"});
  form.append(node("h4",{},"Dados da conversa"));
  addField(form,"Nome exibido","nome_contato",c.nome_contato,{maxlength:200});
  addField(form,"Etapa do funil","etapa",c.etapa,{maxlength:60});
  addField(form,"Observações comerciais","observacoes",c.observacoes,{multiline:true});
  addField(form,"Pendência","pendencia",c.pendencia,{multiline:true,rows:2,maxlength:1000});
  if(customer){
    form.append(node("h4",{},"Cadastro do cliente"));
    addField(form,"Nome","customer_nome",customer.nome);
    addField(form,"E-mail","customer_email",customer.email,{type:"email"});
    addField(form,"Telefone","customer_telefone",customer.telefone);
    addField(form,"CPF/CNPJ","customer_cpf_cnpj",customer.cpf_cnpj);
    addField(form,"Endereço","customer_endereco",customer.endereco,{multiline:true,rows:2});
    addField(form,"Cidade","customer_cidade",customer.cidade);
    addField(form,"Estado","customer_estado",customer.estado,{maxlength:2});
    addField(form,"CEP","customer_cep",customer.cep);
    addField(form,"Observações do cliente","customer_observacoes",customer.observacoes,{multiline:true});
  }else{
    statusLine("O contato foi localizado, mas o cadastro de Cliente não está vinculado ou não está liberado pelas permissões atuais. A edição da conversa continua disponível.");
  }
  const save=node("button",{class:"primary",type:"submit"},"Salvar alterações");
  form.append(save);
  form.addEventListener("submit",async event=>{
    event.preventDefault();save.disabled=true;save.textContent="Salvando...";
    const values=Object.fromEntries(new FormData(form).entries());
    const conversationFields={
      nome_contato:values.nome_contato,
      etapa:values.etapa,
      observacoes:values.observacoes,
      pendencia:values.pendencia
    };
    try{
      const cr=await api({action:"conversation.update",conversation_id:c.id,fields:conversationFields});
      if(!cr?.ok)throw new Error(cr?.data?.error||cr?.error||"Falha ao salvar conversa.");
      if(customer){
        const customerFields={
          nome:values.customer_nome,email:values.customer_email,telefone:values.customer_telefone,
          cpf_cnpj:values.customer_cpf_cnpj,endereco:values.customer_endereco,cidade:values.customer_cidade,
          estado:values.customer_estado,cep:values.customer_cep,observacoes:values.customer_observacoes
        };
        const ur=await api({action:"customer.update",customer_id:customer.id,fields:customerFields});
        if(!ur?.ok)throw new Error(ur?.data?.error||ur?.error||"Conversa salva, mas o cadastro do cliente não foi atualizado.");
        currentRecord.customer=ur.data.customer;
      }
      currentRecord.conversation=cr.data.conversation;
      resultEl.replaceChildren();
      statusLine("Alterações salvas no CRM PlaceFit.");
      renderSaveSummary(currentRecord);
    }catch(err){statusLine(err.message||"Erro ao salvar.",true);}
    finally{save.disabled=false;save.textContent="Salvar alterações";}
  });
  resultEl.append(form);
}
function renderSaveSummary(data){
  const c=data.conversation;
  resultEl.append(node("p",{},(c.nome_contato||"Contato")+" · etapa "+(c.etapa||"novo")));
  const edit=node("button",{class:"secondary"},"Editar novamente");
  edit.addEventListener("click",()=>renderMatched(data));
  resultEl.append(edit);
}
async function lookup(phone,source="manual"){
  const clean=String(phone||"").trim();
  if(!clean){resultEl.replaceChildren();statusLine("Informe um telefone com DDD para pesquisar.",true);return;}
  const key=clean.replace(/\D/g,"");
  if(key===lastLookupKey&&currentRecord)return;
  lastLookupKey=key;currentRecord=null;
  resultEl.replaceChildren();statusLine("Consultando CRM...");
  const response=await api({action:"contact.lookup",phone:clean});
  resultEl.replaceChildren();
  if(!response?.ok){statusLine(response?.data?.error||response?.error||"Não foi possível consultar o CRM.",true);return;}
  const data=response.data||{};
  if(data.status==="matched"){renderMatched(data);return;}
  if(data.status==="ambiguous"){statusLine("Encontramos mais de uma conversa com este telefone. Não fizemos associação automática.",true);return;}
  statusLine("Nenhuma conversa correspondente encontrada no CRM. Nenhum contato foi criado ou associado.");
}
async function checkAuth(){
  const r=await api({action:"me"});
  if(!r?.ok){
    showAuth(false,r?.data?.error==="CRM_ACCESS_NOT_CONFIGURED"?"Login reconhecido, mas este usuário ainda não possui vínculo ativo com o CRM.":"Conecte sua conta PlaceFit para habilitar as consultas.");
    return false;
  }
  const u=r.data.user||{},w=r.data.workspace||{};
  showAuth(true,"Conectado como "+(u.full_name||u.email||"usuário")+" · perfil "+(w.papel||"equipe")+".");
  return true;
}
async function refreshContext(){
  const {activeContext}=await chrome.storage.session.get("activeContext");
  if(!activeContext){contextEl.textContent="Abra uma conversa no WhatsApp Web ou informe o telefone abaixo.";return;}
  if(activeContext.chatHint){
    contextEl.textContent="Telefone detectado: "+activeContext.chatHint+".";
    lookupPhone.value=activeContext.chatHint;
    if(await checkAuth())await lookup(activeContext.chatHint,"whatsapp");
  }else{
    contextEl.textContent="Conversa aberta, mas o WhatsApp não forneceu um telefone identificável. Use a busca manual; não faremos associação por nome ou LID desconhecido.";
    resultEl.replaceChildren();
    statusLine("Identificação automática indisponível nesta conversa. O painel não tentará adivinhar o contato.");
  }
}
connectBtn.addEventListener("click",async()=>{
  connectBtn.disabled=true;
  const oldLabel=connectBtn.textContent;
  connectBtn.textContent="Abrindo autenticação...";
  authMessage.textContent="Solicitando abertura da página segura do PlaceFit...";
  try{
    const result=await chrome.runtime.sendMessage({type:"PLACEFIT_OPEN_AUTH"});
    if(!result?.ok)throw new Error(result?.error||"Não foi possível abrir a página de autenticação.");
    authMessage.textContent="Página de autenticação aberta em uma nova aba. Faça login no PlaceFit.";
  }catch(error){
    authMessage.textContent="Falha ao abrir a autenticação: "+(error?.message||"erro de comunicação com a extensão")+". Recarregue a extensão em chrome://extensions e tente novamente.";
  }finally{
    connectBtn.disabled=false;
    connectBtn.textContent=oldLabel;
  }
});
logoutBtn.addEventListener("click",async()=>{
  await chrome.runtime.sendMessage({type:"PLACEFIT_LOGOUT"});
  currentRecord=null;lastLookupKey="";resultEl.replaceChildren();
  showAuth(false,"Sessão encerrada neste navegador.");
});
lookupBtn.addEventListener("click",async()=>{
  if(!(await checkAuth()))return;
  await lookup(lookupPhone.value);
});
lookupPhone.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();lookupBtn.click();}});
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area!=="session")return;
  if(changes.authToken)checkAuth();
  if(changes.activeContext)refreshContext();
});
checkAuth().then(refreshContext);
