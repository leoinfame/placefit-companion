# Contrato implementado — crm-companion

## Princípios
- Exige sessão Base44 autenticada via Authorization: Bearer.
- Deriva usuário e tenant da sessão e do vínculo ativo em CRMEquipe.
- Ignora IDs de owner/tenant enviados pelo cliente como fonte de autorização.
- Não lê o corpo das mensagens do WhatsApp.
- Não expõe whatsapp_secrets, tokens WAHA ou credenciais de provedores.
- A função antiga crm-whatsapp permanece separada e inalterada.

## Operações implementadas
- me: valida sessão e retorna usuário/workspace.
- contact.lookup: busca por telefone normalizado ou LID previamente associado; retorna matched, ambiguous ou not_found.
- conversation.update: permite alterar etapa, nome exibido, observações e pendência em conversa autorizada.
- customer.update: permite alterar campos comerciais permitidos do Cliente, respeitando o RLS existente: fornecedor dono, criador original ou admin.
- lists.list: lista somente listas visíveis ao papel/equipe.
- stages.list: retorna etapas ativas do tenant.

## Identificação
- Telefone remove máscara e trata DDI 55 brasileiro sem confundir DDD 55 com código de país.
- LID é tratado como identificador opaco e nunca convertido em telefone.
- Se telefone e LID apontarem para registros diferentes, retorna ambiguidade.
- Se houver mais de uma conversa correspondente, não escolhe automaticamente.
- A extensão só tenta identificação automática quando recebe um telefone confiável na URL /send?phone=.
- Se o WhatsApp não fornecer telefone, oferece busca manual. Não tenta inferir por nome, conteúdo de mensagens ou LID desconhecido.

## Permissões
- A consulta de conversa respeita o tenant e a atribuição ao atendente; dono/supervisor seguem o papel já definido em CRMEquipe.
- A extensão não concede direitos adicionais a membros da equipe.
- A edição de Cliente replica as regras atuais do RLS de Cliente. Ser atendente ou supervisor, isoladamente, não concede edição do cadastro.
- Todas as operações com acesso privilegiado usam allowlists de campos e validação explícita no servidor.

## Fora do escopo desta entrega
- Envio de mensagens, recebimento, automações, IA e leitura do conteúdo das conversas.
- Resolver LIDs diretamente do DOM/WhatsApp sem mapeamento confiável.
- Criar ou associar automaticamente novos clientes.
- Alterar a função antiga crm-whatsapp.
