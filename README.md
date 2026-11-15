# PlaceFit Companion — scaffold técnico

Extensão Chrome Manifest V3 para integrar o WhatsApp Web ao CRM PlaceFit.

## Estado deste scaffold
- Estrutura inicial de extensão Chrome.
- Painel lateral abre no WhatsApp Web.
- Identificador obtido da URL é apenas uma pista, nunca autorização.
- Camada de API isolada no service worker, ainda sem autenticação/API configuradas.
- Nenhuma mensagem é enviada e nenhum dado do CRM é alterado.

## Base e licença
A arquitetura visual/estrutural foi inspirada no Pipezy (https://github.com/tanujrajputdev/pipezy), licenciado sob MIT. Este scaffold é uma implementação nova, sem copiar arquivos do Pipezy. Se incorporarmos trechos desse projeto futuramente, manteremos avisos de copyright e licença.

## Instalação local
1. Clone ou baixe este repositório.
2. Abra chrome://extensions.
3. Ative Modo do desenvolvedor.
4. Clique em Carregar sem compactação e selecione a pasta.
5. Abra https://web.whatsapp.com/ e clique no ícone da extensão.

## Próximas etapas obrigatórias
1. Validar autenticação Base44 para extensão.
2. Criar backend crm-companion com autorização por tenant/equipe.
3. Definir campos permitidos para leitura e edição.
4. Resolver telefone ↔ conversa e casos LID sem associação ambígua.
5. Testar dono, supervisor e atendente.
6. Revisar segurança em homologação.

## Segurança
- Não colocar tokens WAHA/WhatsApp Cloud API na extensão.
- Não confiar em telefone, conversa_id, owner_id ou tenant_id enviados pelo content script.
- Backend deve derivar usuário/tenant da sessão e autorizar cada registro.
- Não usar chrome.storage.local como fonte da verdade do CRM.
- Não ler nem transmitir conteúdo das mensagens nesta primeira versão.
