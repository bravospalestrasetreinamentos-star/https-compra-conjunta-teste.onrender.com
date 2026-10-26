# Compra Conjunta 0.5 — Portal com autenticação local

## Iniciar

Requer Node.js 20+. Execute `node server.js` nesta pasta e acesse **http://localhost:3000**. Não precisa de npm ou internet.

## Contas de demonstração (somente ambiente local)

- Cliente: `cliente@demo.local` / `ClienteDemo2026!`
- Admin do sistema: `admin@demo.local` / `AdminDemo2026!`
- Admin da loja Mercado Exemplo: `loja@demo.local` / `LojaDemo2026!`

## O que funciona

- Login com senha derivada por scrypt, cookie de sessão HttpOnly e SameSite=Strict, expiração após 8 horas, limite simples de tentativas.
- Endpoints autenticados e autorização por papel (RBAC) e loja no **servidor**.
- Módulos independentes do cliente, administração geral e administração de loja.
- A conta da loja também pode acessar o módulo cliente.
- Loja só consulta e atualiza pedidos do próprio estabelecimento, com validação das transições e auditoria.
- Banco de dados de demonstração em `data/db.json` (criado na primeira execução).
- Catálogo antigo preservado em `/legacy.html` **como demonstração isolada**.

## LIMITAÇÕES / não é produção

Este é um protótipo LOCAL de autenticação e permissões, não um SaaS pronto para publicar. O armazenamento usa arquivo JSON, sessões ficam em RAM, não há cadastro/recuperação de senha, validação real de email, 2FA, gateway de pagamento ou banco PostgreSQL. Antes de colocar online: substituir por PostgreSQL e migrações; autenticação robusta com sessões persistidas, CSRF tokens, HTTPS e cookies Secure; verificação de email, recuperação, controles antiabuso, monitoramento, testes de autorização, logs imutáveis, backups; desabilitar/remover contas de demonstração e integrações legadas sem autenticação. A vitrine legada mantém seus próprios pedidos e armazenamento local e NÃO usa este login.

**Não usar com clientes, senhas ou pagamentos reais e não expor à internet pública.**


## Versão 0.6 — importação de produtos
- Login de administrador de loja -> módulo Minha Loja -> Importação em lote.
- Baixe `modelo_produtos.csv`, edite no Excel e exporte CSV UTF-8 separado por ponto e vírgula.
- Até 100 itens por operação, com pré-visualização e confirmação.
- Cada linha é validada no servidor; em qualquer erro o lote inteiro é recusado.
- Identidade de atualização: loja + SKU + lote.
- Produtos são salvos no arquivo local `data/db.json`, não em PostgreSQL.
- Dados de teste. Não hospedá-lo publicamente sem hardening de segurança.


## v0.7 — Simulador Administrativo de Taxas
No painel Administrador do Sistema use **Simulador de Taxas**. Há três categorias fictícias: alimentos 8%, limpeza 4%, higiene 5%, com volumes demonstrativos de R$ 200 mil, R$ 120 mil e R$ 80 mil. O administrador pode mudar percentuais para elaborar um cenário, visualizar receita atual, projetada e variação, salvar no histórico e decidir aprovar/rejeitar **o estudo**. Aprovar um cenário **NÃO** aplica tarifas reais, NÃO altera `db.rates` e NÃO movimenta pagamentos. Os dados são demonstrativos e gravados localmente em data/db.json.

## v0.8 — Chat das lojas

- Cliente autenticado inicia conversa com uma loja e recebe triagem automática **demonstrativa, baseada em regras locais**, não um modelo OpenAI conectado.
- Cliente pode pedir humano a qualquer momento; temas sensíveis como estorno e reclamações geram transferência para fila.
- Administrador da loja visualiza **somente conversas de sua loja**, assume e responde, podendo encerrar.
- Histórico armazenado em `data/db.json` para teste local. API exige autenticação e confere vínculo cliente/loja.
- Ainda sem integração real de IA, notificações, anexos, recuperação de senha, banco PostgreSQL ou infraestrutura de produção.
- Não utilizar dados reais de clientes. Para operação real, configurar retenção de dados, medidas LGPD, escalabilidade, controles de segurança, observabilidade e auditoria.
