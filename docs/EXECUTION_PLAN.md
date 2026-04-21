# Plano de Execução (Alinhado ao PRD.md)

## Objetivo do produto (MVP)
Sistema web multi-tenant para contadores automatizarem processamento de extratos em PDF (sem armazenar arquivos), extraindo transações via templates de regex e disponibilizando revisão, dashboard e exportação.

## Arquitetura e tecnologias
- Web/API: Next.js (App Router) com Route Handlers: [src/app](file:///home/ismael/dev/extrato-inteligente/src/app)
- Persistência: PostgreSQL + Prisma: [schema.prisma](file:///home/ismael/dev/extrato-inteligente/prisma/schema.prisma)
- Autenticação: NextAuth (Credentials) + bcrypt: [auth.ts](file:///home/ismael/dev/extrato-inteligente/src/auth.ts)
- Parsing: pdf-parse + regex templates persistidos no banco: [process/pdf/route.ts](file:///home/ismael/dev/extrato-inteligente/src/app/api/process/pdf/route.ts), [parse.ts](file:///home/ismael/dev/extrato-inteligente/src/server/pdf/parse.ts)

## Milestones e entregas (cronograma por fases)

## Cronograma sugerido (marcos específicos)
- Semana 1: hardening do MVP (bugs, multi-tenant, dedupe, smoke tests) + documentação base.
- Semana 2: gestão de entidades + ajustes de UX de upload/revisão.
- Semana 3: gestão de templates (inclui tester) + exportação CSV padronizada (colunas e validações).
- Semana 4: revisão/edição com auditoria + conciliação diária (saldo do dia) e regras de aprovação.
- Semana 5: 2FA por email + RBAC completo para telas sensíveis + ajustes de segurança.
- Semana 6: testes de regressão (golden) para 1–2 bancos + otimizações de performance do dashboard.

### M1 — MVP funcional e auditável
- Upload de PDF por entidade.
- Identificação de banco/template.
- Parsing de transações + dedupe.
- Persistência (Statement/Transactions) e dashboard.
- Tela de revisão + pendências + aprovação.
- Exportação CSV.
- Entregáveis: pipeline end-to-end para 1–2 bancos, seed funcional, smoke tests.

### M2 — Gestão operacional (SaaS e cliente)
- CRUD de Entidades (cliente) com RBAC.
- CRUD de Templates (cliente) com validação e teste rápido.
- CRUD de Usuários (cliente) e CRUD de Clientes (admin SaaS).
- Entregáveis: console administrativo mínimo e fluxo sem necessidade de seed.

### M3 — Segurança e 2FA (V2 do PRD)
- 2FA por email (código 6 dígitos com expiração e limite de tentativas).
- Auditoria de ações sensíveis (criar/excluir templates, aprovar/exportar).
- Entregáveis: política de autenticação reforçada e trilhas de auditoria.

### M4 — Qualidade de extração e conciliação (V2/V3)
- Parsing de “saldo do dia” por template e conciliação diária.
- Golden files por banco/template (regressão) e relatório de acurácia.
- Entregáveis: testes de regressão automatizados e métricas por banco.

### M5 — Escalabilidade e OCR (V3)
- Worker assíncrono para OCR e processamento com fila/retries.
- Score de confiança e roteamento para revisão.
- Entregáveis: cobertura para PDFs escaneados e processamento escalável.

## Alocação de recursos (baseline)
- Backend (Prisma + parsing + APIs): 1 eng.
- Frontend (UI revisão/dashboard/admin): 1 eng.
- QA (cenários, golden files, regressão): 0.5 eng.
- Produto/UX (fluxos e critérios de aceitação): 0.25 eng.

## Riscos e mitigações
- PDFs inconsistentes/sem texto: fallback futuro com OCR; detecção e issue específica (OCR_BAIXA_CONFIANCA).
- Regex frágeis por banco: versionamento de templates, fixtures e golden tests.
- Multi-tenant vazando dados: padronizar guards por clientId, testes de isolamento e revisão de rotas.
- Duplicidade: dedupeHash consistente (ingestão + edição manual) e constraints no banco.
- Performance do dashboard: agregações no banco e paginação.

## Critérios de sucesso mensuráveis
- Performance: upload+processamento < 5s para PDFs com texto em dataset de referência.
- Extração: ≥ 99% de transações com data e valor corretos após revisão (por banco suportado).
- Dedupe: 0 duplicatas persistidas para mesma entidade no mesmo período em reprocessamento.
- Multi-tenant: 0 leituras/escritas fora do clientId em testes automatizados.
- Exportação: CSV compatível com planilhas (valores numéricos, sinal coerente com tipo).

## Checklist de conformidade (PRD)
- Não armazenar PDFs: garantir que somente metadados sejam persistidos (Statement/Run/Issues).
- Isolamento por clientId: obrigatório em todas as queries/exports.
- Auditoria mínima: alterações manuais (TransactionAudit) e mudanças de status (aprovação/exportação).
