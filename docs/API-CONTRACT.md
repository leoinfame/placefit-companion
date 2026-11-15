# Contrato inicial proposto — crm-companion

Ainda não implementado. Proposta para revisão.

## Princípios
- Exigir sessão Base44 autenticada.
- Derivar user/tenant no servidor; ignorar IDs de tenant/owner enviados pelo cliente.
- Validar CRMEquipe, papel e atribuição da conversa em cada operação.
- Nunca expor whatsapp_secrets nem tokens de provedores.
- Usar allowlist de campos, validação de tipos e auditoria de alterações.

## Operações candidatas
- contact.lookup: telefone normalizado e/ou identificador LID já mapeado; retornar matched, ambiguous ou not_found.
- conversation.get: dados comerciais mínimos da conversa autorizada.
- conversation.update: somente etapa, observações, lista e responsável, conforme papel.
- customer.update: campos explicitamente permitidos e após corrigir/confirmar RLS de Cliente.
- history.list: histórico CRM autorizado, com paginação.

## Bloqueios antes do backend
1. Definir modelo de sessão para extensão; não copiar token do localStorage do site.
2. Corrigir/definir RLS para atendentes em Cliente e CRMProximoPasso.
3. Criar testes de isolamento entre tenants e papéis.
4. Não reutilizar a função antiga crm-whatsapp sem corrigir validação de propriedade e autorização.
