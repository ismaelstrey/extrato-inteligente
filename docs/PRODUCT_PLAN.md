# Extrato Inteligente — Plano do Produto

## Contexto e objetivo

O Extrato Inteligente é um SaaS multi-tenant para contadores e escritórios contábeis que automatiza a extração de dados contábeis a partir de extratos bancários em PDF, transforma dados não estruturados em transações estruturadas, valida consistência (incluindo conciliação por saldo quando disponível) e exporta em formatos compatíveis com sistemas contábeis, reduzindo o trabalho manual e erros operacionais.

Referências internas:
- PRD base: [PRD.md](file:///d:/DEV/extrato-inteligente/PRD.md)
- PDF de referência (layout real): [2026-01-01_2026-02-28.pdf](file:///d:/DEV/extrato-inteligente/2026-01-01_2026-02-28.pdf)

## Padrões observados no PDF de referência (o que o produto precisa suportar)

Do PDF de referência, o texto extraído contém padrões consistentes:
- Cabeçalho com metadados: “Emitido em”, “Periodo”, razão social, CNPJ, instituição, agência e conta.
- Seção tabular com colunas “Descrição”, “Data”, “Valor”.
- Linhas de transação iniciando por data `DD/MM/YYYY` e finalizando com valor monetário em formato BR (`R$ 1.234,56`), com débito representado como `-R$ 123,45`.
- Linhas de saldo diário no formato `Saldo do dia    DD/MM/YYYY R$ 999,99` (essenciais para validação e conciliação).
- Transações com padrões recorrentes: `Pix enviado`, `Pix recebido`, `Vendas`, `Rendimento da conta`.

Implicação: o produto deve tratar duas “famílias” de linhas: movimentos e “saldo do dia”, e manter um mecanismo de normalização robusto para moeda e datas.

## Personas e necessidades

- Administrador (SaaS)
  - Precisa: gerenciar clientes, visibilidade de uso, controle de templates globais, auditoria e suporte.
- Cliente (empresa contábil)
  - Precisa: administrar usuários e entidades, padronizar templates, garantir isolamento por cliente e exportações consistentes.
- Usuário final (contador/assistente)
  - Precisa: processar PDFs rapidamente, revisar somente exceções, exportar com confiança, reduzir erros.

## Proposta de valor e diferenciação

- Extração híbrida (texto nativo + OCR sob demanda) com validações contábeis.
- Templates configuráveis por instituição (banco/provedor) com versionamento e testes.
- Fluxo de revisão e aprovação orientado por “pendências” (issues) para garantir precisão alta.
- Exportações padronizadas e conectores (evolutivos) para ecossistemas contábeis.

## Escopo (MVP vs evoluções)

### MVP (entregar valor cedo)
- Upload e processamento de PDFs com camada de texto (sem OCR).
- Identificação da instituição do extrato por assinatura (texto-chave).
- Parsing de transações + deduplicação.
- Validações básicas (datas, moeda, formato, duplicidade).
- Dashboard básico (entradas/saídas/saldo do período).
- Exportação CSV padronizada.

### V2 (robustez e qualidade)
- Tela de revisão com pendências e correções manuais.
- Validação forte por conciliação quando “saldo do dia” existir.
- Versionamento de templates e suíte de testes por banco.
- Exportação XLSX.

### V3 (cobertura e automação)
- OCR para PDFs escaneados (fallback).
- Classificação contábil por regras e aprendizado (assistido).
- Conectores com sistemas contábeis (por demanda comercial).

## Requisitos funcionais (RF)

### RF-A Autenticação e multi-tenant
- Login por email e senha.
- Sessão com validade de 7 dias.
- Isolamento de dados por `clientId` em todas as rotas, queries e exports.

### RF-B Gestão (clientes, usuários, entidades)
- CRUD de clientes (admin SaaS).
- CRUD de usuários e papéis (cliente).
- CRUD de entidades (empresas/mercados) por cliente.

### RF-C Upload e processamento
- Upload de PDF por entidade e período.
- Execução do pipeline de extração:
  - extração de texto
  - identificação da instituição
  - parsing estruturado
  - validações
  - persistência (sem armazenar o PDF)
- Resposta com resumo do processamento:
  - instituição/template identificado
  - total de transações encontradas
  - inseridas vs duplicadas
  - pendências encontradas

### RF-D Classificação e cálculos contábeis
- Classificação mínima:
  - crédito, débito, tarifa, juros, impostos, estorno, transferência (PIX/TED/DOC), rendimento
- Cálculos:
  - totais por categoria
  - saldo inicial/final do período (quando inferível)
  - conciliação diária (quando “saldo do dia” existir)

### RF-E Revisão e aprovação
- Tela para revisar resultados, com:
  - lista de pendências (issues) priorizadas
  - edição manual de transações (data, descrição, valor, tipo/categoria)
  - aprovação final do extrato
- Histórico de alterações (auditoria).

### RF-F Exportação e integrações
- CSV padrão (MVP):
  - data, descrição, valor, tipo (entrada/saída), categoria, entidade, instituição, id de origem
- XLSX (V2).
- OFX e conectores (V3).
- Webhook opcional: “extrato aprovado/exportado”.

## Requisitos não funcionais (RNF)

### Segurança e LGPD
- Não armazenar PDFs após processamento (somente metadados e dados extraídos).
- Auditoria: trilha de quem processou/revisou/aprovou/exportou.
- Segredos em `.env`, sem logar dados sensíveis (PII e credenciais).

### Performance
- Meta: processamento de PDF médio < 5s quando houver camada de texto.
- OCR: processamento assíncrono (fila) com feedback de status.

### Confiabilidade e observabilidade
- Logs estruturados por execução (`extractionRunId`) com métricas por etapa.
- Monitoramento de acurácia, taxa de pendências, taxa de retrabalho.

## Arquitetura técnica (alto nível)

### Componentes
- Web App (Next.js): UI de upload, revisão, dashboard e exportação.
- API (Next.js Route Handlers): endpoints para processamento, templates, exportações.
- Worker (V2/V3): processamento assíncrono e OCR (fila + retries).
- PostgreSQL + Prisma: persistência multi-tenant.

### Pipeline de extração (determinístico + validado)
1) Ingestão (upload) e criação do “extrato” (sem PDF persistido).
2) Extração do texto (camada de texto).
3) Identificação de instituição/template (assinaturas + heurísticas).
4) Parsing:
   - transações
   - saldos diários (“Saldo do dia”) quando existir
5) Normalização e classificação.
6) Validações e conciliação.
7) Persistência e geração de pendências.
8) Revisão/aprovação e exportação.

## OCR e processamento de PDF (estratégia)

### Regra geral
- Text-first: se o PDF tem texto, usar extração nativa.
- OCR fallback: se texto estiver ausente/baixa qualidade.

### Recomendações de OCR (para 99% com previsibilidade)
- OCR gerenciado (preferência):
  - AWS Textract (bom para tabelas/layout)
  - Google Document AI
  - Azure Document Intelligence
- OCR local (alternativa de custo baixo, exige tuning):
  - Tesseract + pré-processamento de imagem

Regra de produto: resultados vindos de OCR exigem score de confiança + revisão obrigatória quando abaixo do limiar.

## Modelo de dados (visão)

A base atual cobre cliente/usuário/entidade/template/transação. Para revisão, auditoria, exportação e 99% de precisão, é necessário evoluir para:
- Extrato (Statement)
- Execuções de extração (ExtractionRun)
- Pendências (ExtractionIssue)
- Exportações (ExportJob)

Detalhes: [DATABASE.md](file:///d:/DEV/extrato-inteligente/docs/DATABASE.md)

## UI/UX (visão)

Telas essenciais:
- Upload de extrato (entidade, período, arquivo)
- Revisão e aprovação (tabela + pendências + conciliação)
- Templates (editor + testes)
- Dashboard e exportação

Detalhes: [QUALITY_AND_UX.md](file:///d:/DEV/extrato-inteligente/docs/QUALITY_AND_UX.md)

## Roadmap e milestones (com entregáveis)

### Milestone 1 — MVP (texto nativo)
- Upload + extração de texto + parsing por template.
- Dedupe e validações básicas.
- Dashboard básico.
- Exportação CSV.
- Entregáveis:
  - pipeline funcional para 1–2 instituições
  - dataset de PDFs de teste e relatório de qualidade inicial

### Milestone 2 — Revisão e conciliação
- Tela de revisão com pendências.
- Parsing de “Saldo do dia” e conciliação diária.
- Auditoria de alterações.
- Entregáveis:
  - modelo de issues
  - trilha de auditoria
  - testes de regressão com “golden files”

### Milestone 3 — OCR e processamento assíncrono
- Worker com fila, retries, e OCR fallback.
- Score de confiança e política de revisão.
- Entregáveis:
  - processamento escalável
  - cobertura para PDFs escaneados

### Milestone 4 — Biblioteca de bancos e templates versionados
- Versionamento e rollout controlado por cliente.
- Suite automatizada por banco/template.
- Entregáveis:
  - catálogo de bancos
  - testes por banco

### Milestone 5 — Integrações contábeis
- XLSX, OFX e conectores priorizados por mercado.
- Entregáveis:
  - exportações e integrações com autenticação e mapeamento

## Estimativas de tempo e recursos (baseline)

Premissas:
- 1–2 bancos/instituições no MVP.
- PDFs com camada de texto no MVP.
- OCR e conectores entram em fases posteriores.

Equipe mínima recomendada:
- 1 Engenheiro fullstack
- 1 Engenheiro de dados/parsing (pode ser compartilhado no início)
- 1 QA (parcial) com dataset e testes de regressão

Estimativas (ordem de grandeza):
- Milestone 1: 3–5 semanas (MVP utilizável, export CSV, 1–2 bancos).
- Milestone 2: 2–4 semanas (revisão + conciliação + auditoria + regressão).
- Milestone 3: 3–6 semanas (fila + OCR + governança de confiança).
- Milestone 4: contínuo (1–2 semanas por banco para template + testes, após estrutura pronta).
- Milestone 5: 2–6 semanas por conector, dependendo do fornecedor e requisitos de autenticação/mapeamento.

## Riscos e mitigação

- PDFs inconsistentes (mudanças de layout): templates versionados + suíte de regressão + rollout por cliente.
- PDFs escaneados/ruído: OCR fallback + revisão obrigatória por confiança.
- Meta 99%: medir por campo e por transação, com governança de revisão.
- Custos de OCR: text-first + OCR sob demanda + limites por plano.

## Métricas e KPIs

- Precisão de extração por campo (data, valor, tipo, descrição).
- Precisão por transação (todas as colunas corretas).
- Taxa de pendências por extrato.
- Tempo total de processamento (p50/p95).
- Tempo de revisão por extrato.
- Taxa de exportação sem edição manual.

