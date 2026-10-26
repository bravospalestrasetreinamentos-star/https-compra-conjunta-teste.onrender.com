# Compra Conjunta — prévia privada no Render

**Uso exclusivo para dados fictícios.** Este pacote é um protótipo v0.8, não uma aplicação pronta para clientes reais.

## Instalação pelo GitHub
1. Suba o **conteúdo desta pasta** para a pasta `compra-conjunta-v0_8/` no GitHub, substituindo a versão anterior. Não envie a pasta `data/` nem qualquer arquivo `.env` com credenciais.
2. Render → Web Service, branch `main`, Root Directory `compra-conjunta-v0_8`, linguagem Node.
3. Build Command: `echo "Sem etapa de build"`; Start Command: `node server.js`; plano Free.
4. Environment: `NODE_ENV=production` e `PREVIEW_PASSWORD` com segredo aleatório de pelo menos 16 caracteres (recomendado >=24). **Não envie esse segredo em mensagens.**
5. Deploy. O navegador solicitará autenticação HTTP Basic: usuário `preview` e senha definida em `PREVIEW_PASSWORD`. Depois disso, o login demonstrativo do sistema continua sendo solicitado.

## Segurança e limitações
- Gate HTTP Basic protege TODO o aplicativo de visitantes sem senha, inclusive arquivos de interface e endpoints, mas não substitui autenticação de produção.
- Contas internas de demonstração têm senhas conhecidas no código: use APENAS atrás do gate, com dados inteiramente fictícios, nunca em produção ou ambiente público sem restrição.
- `data/db.json` foi omitido. Na primeira inicialização, uma base demonstrativa é gerada localmente. Render Free não tem armazenamento persistente; dados podem desaparecer após reinicialização ou nova implantação.
- Chat utiliza respostas por regras, sem integração real à OpenAI; pagamentos e split são demonstrativos.
- Não há controles suficientes para cadastro de clientes reais, dados pessoais, valores reais, nem operação financeira. Para lançar ao público: PostgreSQL, sessões persistentes, MFA, usuários sem credenciais fixas, integração de pagamento e auditoria.
- Se a autenticação Basic aparecer repetidamente ou o PWA falhar offline, teste primeiro pelo Chrome no navegador, sem instalar o aplicativo.
