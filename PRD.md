📄 PRD — Sistema de Processamento de Extratos Contábeis
🧾 Nome do Produto

Extrato Inteligente (nome provisório)

🎯 1. Objetivo

Desenvolver um sistema web que permita a contadores automatizar o processamento de extratos bancários em PDF, transformando dados não estruturados em informações organizadas para análise e uso contábil.

🧠 2. Problema

Atualmente:

Contadores recebem extratos em PDF
Precisam somar valores manualmente
Processo é repetitivo, lento e sujeito a erro
Cada banco tem um formato diferente
💡 3. Solução

Sistema que:

recebe PDF
identifica banco automaticamente
aplica regras (regex configurável)
extrai transações
salva dados estruturados
exibe em dashboard
👥 4. Stakeholders
Contadores (usuário final)
Empresas contábeis (clientes)
Administrador do sistema (SaaS)
👤 5. Perfis de Usuário
🔑 Administrador
gerencia clientes
monitora uso
🏢 Cliente (empresa contábil)
acessa dashboard
gerencia usuários
gerencia entidades (empresas/mercados)
👨‍💻 Usuário
faz upload de extratos
processa dados
visualiza resultados
🧱 6. Funcionalidades
🔐 Autenticação
login com email e senha
autenticação em dois fatores via email
sessão com validade de 7 dias
🏢 Gestão de Clientes
criar cliente
editar cliente
associar usuários
👥 Gestão de Usuários
criar usuário
definir papel (role)
ativar/desativar 2FA
🏪 Gestão de Entidades
cadastrar empresa (ex: Mercado Barato)
editar/excluir entidade
associar ao cliente
📄 Upload e Processamento de PDF
upload de arquivo PDF
extração de texto
identificação do banco
aplicação de regex configurada
geração de JSON estruturado
descarte do PDF após processamento
🧩 Templates de Regex
cadastro de templates por banco
campos:
nome
identificador
regex_data
regex_valor
regex_descricao
💾 Armazenamento de Dados
salvar transações no banco
não salvar PDFs
📊 Dashboard
total de entradas
total de saídas
saldo
gráfico por período
filtro por entidade
filtro por data
🔄 7. Fluxo Principal
Usuário faz login
↓
Seleciona entidade
↓
Faz upload do PDF
↓
Sistema extrai texto
↓
Identifica banco
↓
Aplica regex
↓
Gera JSON
↓
Salva transações
↓
Atualiza dashboard
📦 8. Estrutura de Dados (Alto nível)
User
id
nome
email
senha_hash
role
client_id
two_factor_enabled
Client
id
nome
Entity
id
nome
client_id
Template
id
nome
identificador
regex_data
regex_valor
regex_descricao
Transaction
id
entity_id
data
descricao
valor
tipo
🔐 9. Segurança
criptografia de senha (bcrypt)
JWT ou sessão segura
2FA via email
isolamento por client_id (multi-tenant)
não armazenar PDFs
⚙️ 10. Requisitos Técnicos
Stack
Next.js (fullstack)
PostgreSQL
Prisma ORM
Bibliotecas
pdf-parse (extração de PDF)
Zod (validação)
Auth.js (autenticação)
⚠️ 11. Requisitos Não Funcionais
performance: processamento < 5s por PDF médio
escalabilidade futura (microserviço de parsing)
segurança (LGPD-friendly)
disponibilidade web
🧠 12. Regras de Negócio
cada usuário pertence a um cliente
usuário só acessa dados do seu cliente
transações não podem ser duplicadas
PDF não deve ser armazenado
⚠️ 13. Riscos
PDFs com layout inconsistente
PDFs escaneados (imagem)
regex não capturar corretamente
duplicidade de dados
🚀 14. Roadmap
MVP
login
cadastro cliente
upload PDF
regex parsing
salvar transações
dashboard básico
V2
2FA
editor de regex
filtros avançados
prevenção de duplicidade
V3
OCR
IA para parsing
automação
📊 15. Métricas de Sucesso
tempo economizado por usuário
número de PDFs processados
taxa de erro na extração
retenção de clientes
💡 16. Diferenciais
regex configurável por banco
não depende de padrão fixo
leve e rápido
multi-tenant
focado em contabilidade real
🎯 Conclusão

Você está construindo:

👉 um sistema SaaS de automação contábil
👉 com potencial real de mercado
👉 e tecnicamente muito bem estruturado

🚀 Próximo passo

Agora temos base sólida.

👉 Próximo nível lógico:

modelagem Prisma (banco real)
ou iniciar projeto Next.js

Só me diga:

👉 “banco”
ou
👉 “código”

e seguimos 🔥

Agentes de desenvolvimento:
/agents/architect.md
/agents/backend.md
/agents/frontend.md
/agents/qa.md