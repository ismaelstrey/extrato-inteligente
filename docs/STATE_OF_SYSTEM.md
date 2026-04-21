# Estado Atual do Sistema (Auditoria vs PRD)

## O que já existe (implementado)

### Autenticação
- Login por email/senha via NextAuth (Credentials) com bcrypt: [auth.ts](file:///home/ismael/dev/extrato-inteligente/src/auth.ts)
- Sessão JWT com maxAge de 7 dias: [auth.ts](file:///home/ismael/dev/extrato-inteligente/src/auth.ts)
- Papéis (role): ADMIN_SAAS, CLIENT_ADMIN, USER: [schema.prisma](file:///home/ismael/dev/extrato-inteligente/prisma/schema.prisma)

### Multi-tenant
- `clientId` presente no usuário e propagado para sessão/JWT: [next-auth.d.ts](file:///home/ismael/dev/extrato-inteligente/src/types/next-auth.d.ts), [auth.ts](file:///home/ismael/dev/extrato-inteligente/src/auth.ts)
- Queries das rotas principais filtram por `clientId` (ex.: templates, statements, export): [src/app/api](file:///home/ismael/dev/extrato-inteligente/src/app/api)

### Upload e processamento de PDF (sem armazenar arquivo)
- Upload via form-data e extração de texto com pdf-parse (runtime nodejs): [process/pdf/route.ts](file:///home/ismael/dev/extrato-inteligente/src/app/api/process/pdf/route.ts)
- Identificação de template por `identificador` (regex/fallback): [process/pdf/route.ts](file:///home/ismael/dev/extrato-inteligente/src/app/api/process/pdf/route.ts)
- Parsing por regex (data/valor/descrição), classificação básica e dedupeHash: [parse.ts](file:///home/ismael/dev/extrato-inteligente/src/server/pdf/parse.ts)
- Persistência de Statement, ExtractionRun, Transaction e DailyBalances: [schema.prisma](file:///home/ismael/dev/extrato-inteligente/prisma/schema.prisma)

### Revisão, pendências e aprovação
- Tela de revisão com pendências e tabela de transações: [statements/[statementId]/page.tsx](file:///home/ismael/dev/extrato-inteligente/src/app/app/statements/%5BstatementId%5D/page.tsx)
- Regras: bloquear aprovação com pendências HIGH: [approve/route.ts](file:///home/ismael/dev/extrato-inteligente/src/app/api/statements/%5BstatementId%5D/approve/route.ts)
- Reconciliar saldos diários e abrir/fechar issue SALDO_DIVERGENTE: [reconcileStatement.ts](file:///home/ismael/dev/extrato-inteligente/src/server/reconcile/reconcileStatement.ts)
- Auditoria de edição manual (TransactionAudit): [schema.prisma](file:///home/ismael/dev/extrato-inteligente/prisma/schema.prisma), [transactions route](file:///home/ismael/dev/extrato-inteligente/src/app/api/transactions/%5BtransactionId%5D/route.ts)

### Exportação
- Exportação CSV para extrato aprovado: [export/csv/route.ts](file:///home/ismael/dev/extrato-inteligente/src/app/api/statements/%5BstatementId%5D/export/csv/route.ts)

### Dashboard
- Totais por período, por categoria e por entidade: [dashboard/page.tsx](file:///home/ismael/dev/extrato-inteligente/src/app/app/dashboard/page.tsx)

## Gaps vs PRD (não atendidos ou incompletos)

### 2FA por email
- Implementado fluxo de 2FA por email (código com expiração usando VerificationToken) e UI no login: [auth.ts](file:///home/ismael/dev/extrato-inteligente/src/auth.ts), [LoginForm](file:///home/ismael/dev/extrato-inteligente/src/app/login/LoginForm.tsx)

### Gestão de Clientes e Usuários
- CRUD de clientes (ADMIN_SAAS) e de usuários (CLIENT_ADMIN/ADMIN_SAAS) implementados via API e UI: [clients API](file:///home/ismael/dev/extrato-inteligente/src/app/api/clients/route.ts), [users API](file:///home/ismael/dev/extrato-inteligente/src/app/api/users/route.ts), [clients UI](file:///home/ismael/dev/extrato-inteligente/src/app/app/clients/page.tsx), [users UI](file:///home/ismael/dev/extrato-inteligente/src/app/app/users/page.tsx)

### Gestão de Entidades
- PRD exige CRUD; foi adicionado CRUD de entidades (UI + API). Ainda faltam telas de usuários/clientes.

### Regras de negócio e qualidade
- “Transações não podem ser duplicadas”: há dedupe por hash + unique, mas faltava atualizar dedupeHash em edição manual (corrigido).
- “Descartar PDF”: ok no fluxo do servidor (não persiste arquivo).
- Faltam métricas formais de qualidade (acurácia por banco) e mecanismo de golden files.

### Testes
- Não havia testes unitários; foi adicionada suíte mínima (unit) e smoke test baseado nos PDFs em `extratos/`.
- Não existe integração completa Upload → DB → Revisão → Exportação automatizada (depende de ambiente de DB e fixtures).

## Melhorias recomendadas (próximas prioridades)
- Implementar 2FA por email (token 6 dígitos, expiração, tentativa/limite, envio).
- CRUD de usuários e clientes com RBAC consistente.
- Otimizar dashboard com agregações no banco (evitar carregar todas as transações em períodos grandes).
- Observabilidade: correlacionar ExtractionRun com logs e métricas por etapa.
