# Modelo de Dados — Proposta (Prisma/PostgreSQL)

Este documento descreve a evolução do schema para suportar:
- processamento de extratos sem armazenar PDFs
- auditoria, revisão e aprovação
- validações/pendências (issues)
- exportações e integrações

Base atual: [schema.prisma](file:///d:/DEV/extrato-inteligente/prisma/schema.prisma)

## Princípios

- Multi-tenant: toda entidade de negócio deve ser associada a `clientId`, direta ou indiretamente.
- Não armazenar PDF: armazenar apenas metadados, texto extraído por página (opcional) e dados estruturados.
- Auditabilidade: toda correção manual e aprovação precisa de histórico.
- Idempotência: dedupe por hash/fonte e proteção contra reprocessamento duplicado.

## Entidades novas (proposta)

### 1) Statement (Extrato)

Representa um extrato importado (sem o arquivo).

Campos sugeridos:
- `id`
- `clientId`
- `entityId`
- `bankId` (opcional, se identificado)
- `periodStart`, `periodEnd`
- `source` (UPLOAD, API, INTEGRATION)
- `status` (UPLOADED, PROCESSED, IN_REVIEW, APPROVED, EXPORTED, FAILED)
- `createdByUserId`
- `createdAt`, `updatedAt`

### 2) ExtractionRun (Execução)

Uma tentativa de processar um extrato (pode haver reprocessamentos).

Campos:
- `id`
- `statementId`
- `method` (TEXT, OCR, HYBRID)
- `status` (RUNNING, DONE, FAILED)
- `startedAt`, `finishedAt`
- `pagesTotal`
- `metrics` (JSON: tempos por etapa, contagens, etc.)
- `errorCode`, `errorMessage` (sanitizado)

### 3) StatementPageText (opcional)

Armazena o texto extraído por página para depuração e auditoria, sem guardar o PDF.

Campos:
- `id`
- `statementId`
- `pageNumber`
- `text`
- `hash` (para idempotência e comparação)

Política: pode ser desativável por configuração e/ou ter retenção curta.

### 4) ExtractionIssue (Pendência)

Pendências geradas por validações e inconsistências.

Campos:
- `id`
- `statementId`
- `runId`
- `severity` (LOW, MEDIUM, HIGH)
- `type` (SALDO_DIVERGENTE, LINHA_INVALIDA, DATA_FORA_PERIODO, VALOR_INVALIDO, OCR_BAIXA_CONFIANCA, TEMPLATE_NAO_ENCONTRADO, OUTRO)
- `payload` (JSON: detalhes e referências)
- `status` (OPEN, RESOLVED, IGNORED)
- `resolvedByUserId`, `resolvedAt`

### 5) TransactionSource (origem da transação)

Para rastrear de onde uma transação veio (linha/página) e permitir reprocessamentos previsíveis.

Campos:
- `id`
- `transactionId`
- `statementId`
- `pageNumber`
- `rawLine` (opcional)
- `sourceHash` (hash do conteúdo de origem)
- `confidenceScore` (0–1)

### 6) TransactionAudit (auditoria de correções)

Campos:
- `id`
- `transactionId`
- `userId`
- `action` (CREATE, UPDATE, DELETE)
- `before` (JSON)
- `after` (JSON)
- `createdAt`

### 7) ExportJob (exportação)

Campos:
- `id`
- `statementId`
- `format` (CSV, XLSX, OFX, CONNECTOR)
- `status` (REQUESTED, RUNNING, DONE, FAILED)
- `mappingId` (opcional)
- `createdByUserId`
- `outputLocation` (opcional, se houver storage temporário)
- `createdAt`, `finishedAt`

## Ajustes recomendados em entidades atuais

### Template

Evoluir para suportar versionamento e regras de classificação/validação:
- `bankId` (opcional: template global por banco)
- `clientId` (template específico do cliente)
- `version` (int)
- `active` (bool)
- `rules` (JSON: palavras-chave → categoria/tipo, regex de saldo, normalizações)
- `testFixtures` (opcional: ids de PDFs/linhas de teste)

### Transaction

Adicionar rastreabilidade e vínculo ao extrato:
- `statementId` (ou `importBatchId`)
- `confidenceScore` (número)
- `reviewStatus` (AUTO, NEEDS_REVIEW, REVIEWED)
- `reviewedByUserId`, `reviewedAt`

## Enumerações sugeridas

- `StatementStatus`
- `ExtractionMethod`
- `ExtractionRunStatus`
- `IssueSeverity`
- `IssueStatus`
- `ExportFormat`
- `ExportStatus`
- `ReviewStatus`

## Estratégia de migração (incremental)

1) Introduzir `Statement` e `ExtractionRun` sem alterar o fluxo atual.
2) Passar o endpoint de processamento a criar um `Statement` e gravar transações com vínculo.
3) Introduzir `ExtractionIssue` e expor na UI de revisão.
4) Introduzir auditoria e exportações com `ExportJob`.

