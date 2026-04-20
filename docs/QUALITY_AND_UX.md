# Qualidade (99%) e UX de Revisão — Especificação

## Definição prática de “99% de precisão”

Para ser mensurável e gerenciável, a precisão deve ser avaliada em duas dimensões:
- Precisão automática: extração correta sem intervenção humana.
- Precisão final: dado exportado correto após revisão orientada por pendências.

Meta recomendada:
- 99% de precisão final (pós-revisão) por transação, para bancos suportados.
- 95%+ de precisão automática por campo (data e valor) para bancos suportados, evolutivo por instituição.

## Métrica e cálculo

### Nível de campo
- `precision_date`, `precision_amount`, `precision_type`, `precision_description`

### Nível de transação
- transação correta se todos os campos mandatórios estiverem corretos:
  - data, valor, tipo (entrada/saída), descrição normalizada (ou id de origem + texto compatível)

### Dataset “golden”
- PDFs reais por banco e período.
- Ground truth em CSV/JSON versionado no repositório (ou storage controlado).

## Validações de consistência (regras de negócio)

- Datas dentro do período do extrato.
- Valores monetários parseados em BRL com sinal consistente.
- Dedupe:
  - hash por (`entityId`, `data`, `valor`, `descricao_normalizada`, `sourceHash`) e regras específicas por banco.
- Conciliação (quando existir “Saldo do dia”):
  - saldo_reconstituido(dia) deve bater com saldo_declarado(dia) dentro de tolerância configurável.
- Alertas contábeis:
  - tarifas/juros/IOF identificados por palavras-chave e/ou regras do template.

## Fluxo de revisão (UI)

### Tela: Revisão do Extrato

Objetivo: permitir que o usuário resolva pendências rapidamente e aprove o extrato com confiança.

Componentes:
- Resumo:
  - instituição/template identificado
  - período
  - totais (entradas, saídas, tarifas, juros)
  - status de conciliação (ok/divergente)
- Pendências (issues):
  - lista priorizada por severidade
  - filtros por tipo
  - ações rápidas: “corrigir”, “marcar como resolvido”, “ignorar”
- Tabela de transações:
  - edição inline (data, descrição, valor, tipo/categoria)
  - indicação de confiança
  - destaque de linhas envolvidas em pendências
- Ações:
  - “Reprocessar” (se template mudou)
  - “Aprovar” (bloqueado se houver pendências HIGH abertas)
  - “Exportar”

### Regras de aprovação
- Não permitir aprovação com pendências HIGH abertas.
- Permitir aprovação com pendências MEDIUM/LOW se o usuário justificar (campo obrigatório).

## Exportação (UX)

### CSV (MVP)
- Seleção de entidade e período.
- Download imediato após aprovação.
- Colunas mínimas:
  - data
  - descricao
  - valor
  - tipo (ENTRADA/SAIDA)
  - categoria (PIX, VENDAS, TARIFA, JUROS, RENDIMENTO, OUTROS)
  - banco
  - entidade
  - identificador de origem (sourceHash)

### XLSX/OFX (evolução)
- Mapeamento de plano de contas por cliente.
- Templates de exportação por software contábil.

## Testes de qualidade

### Testes automatizados (regressão)
- Dado um PDF “golden”, o parser deve produzir saída idêntica ao ground truth (por banco/template).
- Rodar em CI para toda mudança em parsing/templates.

### Testes de integração
- Upload → processamento → persistência → revisão → exportação.
- Casos:
  - PDF com texto
  - PDF com texto + “Saldo do dia”
  - PDF com OCR (quando habilitado)

### Testes manuais orientados por risco
- PDFs com:
  - múltiplas páginas
  - quebras de linha na descrição
  - valores negativos
  - caracteres especiais e nomes longos
  - ausência de saldo diário

## Critérios de aceitação (exemplos)

- Dado um PDF com texto e linhas no padrão do banco suportado, o sistema deve:
  - extrair ao menos 99% das transações com data e valor corretos após revisão
  - identificar e persistir “Saldo do dia” quando presente
  - apontar divergências de conciliação com detalhes (dia e diferença)
- Exportação CSV deve:
  - manter valores numéricos corretos
  - manter sinal coerente com tipo
  - ser compatível com importação em planilhas/sistemas que aceitem CSV

