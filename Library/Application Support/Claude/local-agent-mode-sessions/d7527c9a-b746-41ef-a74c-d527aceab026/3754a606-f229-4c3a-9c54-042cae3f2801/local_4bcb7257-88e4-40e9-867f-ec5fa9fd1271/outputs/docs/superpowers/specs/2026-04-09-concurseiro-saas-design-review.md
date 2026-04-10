# Design Review — Concurseiro SaaS

Revisao e validacao do design existente antes da implementacao.
Todas as decisoes abaixo foram aprovadas pelo usuario em sessao de brainstorming.

---

## 1. Arquitetura e Deploy

### Decisoes aprovadas

| # | Problema | Decisao |
|---|----------|---------|
| A1 | Deploy indefinido (1 ou 2 servicos) | **2 servicos separados** no Railway: Next.js (:3000) e FastAPI (:8000). Comunicacao via URL interna Railway (~1ms). |
| A2 | Redis sem hospedagem | **Upstash Redis** (serverless, free tier 10k comandos/dia). |
| A3 | Supabase com SQLAlchemy bypassa RLS/Auth | **Trocar Supabase Postgres por Neon Postgres** (serverless, free tier). Manter Supabase apenas para Storage de arquivos. |
| A4 | Retry com asyncio.sleep bloqueia event loop | **Usar APScheduler** para agendar retries como jobs futuros. Nao usar asyncio.sleep para intervalos longos (60-900s). |
| A5 | Passagem de lead_id para Kiwify indefinida | **Verificar API Kiwify** para campos customizados. Fallback: usar email do lead como chave de vinculacao entre Lead e Pedido. |
| A6 | Circuit breaker com tenacity incorreto | **Retry simples com tenacity** para o MVP. Circuit breaker real adiado para Fase 3. Remover import de CircuitBreaker. |

### Impacto no design original

- `design.md` Secao "Decisoes Arquiteturais": atualizar linha "Banco" para Neon Postgres, adicionar linha "Cache" com Upstash Redis
- `design.md` Secao "Entrega Service": substituir `asyncio.sleep(RETRY_INTERVALS[tentativa])` por agendamento via APScheduler
- `design.md` Secao "Circuit Breaker": remover import incorreto, simplificar para retry puro
- `tasks.md` Task 1: atualizar dependencias (remover supabase client, adicionar neon)

---

## 2. Modelos de Dados

### Decisoes aprovadas

| # | Problema | Decisao |
|---|----------|---------|
| D1 | leads sem UNIQUE(email, concurso_id) | **Adicionar UNIQUE(email, concurso_id)**. Endpoint POST /api/v1/leads faz upsert (INSERT ON CONFLICT UPDATE). |
| D2 | leads sem campos UTM | **Adicionar colunas:** `utm_source VARCHAR(100)`, `utm_medium VARCHAR(100)`, `utm_campaign VARCHAR(200)`, `utm_content VARCHAR(200)`, `utm_term VARCHAR(200)`. |
| D3 | pedidos.lead_id NOT NULL impede compra direta | **Tornar lead_id NULLABLE.** No webhook Kiwify, buscar lead por email; se nao existir, criar lead com `origem='compra_direta'`. |
| D4 | alertas FK para campanha_metricas(id) incorreta | **Substituir FK por:** `campanha VARCHAR(200) NOT NULL` + `concurso_id UUID REFERENCES concursos(id)`. Remover `campanha_id UUID`. |
| D5 | editais UNIQUE(orgao, banca, ano) muito grosseiro | **Adicionar campo `numero_edital VARCHAR(20)`.** Alterar constraint para `UNIQUE(orgao, banca, ano, numero_edital)`. |
| D6 | concursos sem cidade/estado | **Adicionar:** `cidade VARCHAR(100)` e `estado CHAR(2)` na tabela concursos. |
| D7 | cupons ausente do schema SQL | **Adicionar tabela cupons** conforme ja definido nas tasks: `codigo UNIQUE`, `desconto_valor`, `desconto_percentual`, `valido_ate`, `ativo`, `usos_max`, `usos_atual`. |

### SQL dos novos campos/tabelas

```sql
-- D1: leads
ALTER TABLE leads ADD CONSTRAINT uq_leads_email_concurso UNIQUE(email, concurso_id);

-- D2: UTMs na leads
ALTER TABLE leads ADD COLUMN utm_source VARCHAR(100);
ALTER TABLE leads ADD COLUMN utm_medium VARCHAR(100);
ALTER TABLE leads ADD COLUMN utm_campaign VARCHAR(200);
ALTER TABLE leads ADD COLUMN utm_content VARCHAR(200);
ALTER TABLE leads ADD COLUMN utm_term VARCHAR(200);

-- D3: pedidos.lead_id nullable
-- Na migracao inicial, definir lead_id como UUID REFERENCES leads(id) sem NOT NULL

-- D5: editais
ALTER TABLE editais ADD COLUMN numero_edital VARCHAR(20) DEFAULT '01';
-- Atualizar UNIQUE para (orgao, banca, ano, numero_edital)

-- D6: concursos
ALTER TABLE concursos ADD COLUMN cidade VARCHAR(100);
ALTER TABLE concursos ADD COLUMN estado CHAR(2);

-- D7: cupons
CREATE TABLE cupons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo          VARCHAR(50) UNIQUE NOT NULL,
    desconto_valor  NUMERIC(10,2),
    desconto_percentual NUMERIC(5,2),
    valido_ate      TIMESTAMPTZ,
    ativo           BOOLEAN DEFAULT TRUE,
    usos_max        INTEGER,
    usos_atual      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabela alertas corrigida

```sql
CREATE TABLE alertas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concurso_id UUID REFERENCES concursos(id),
    campanha    VARCHAR(200) NOT NULL,
    tipo        VARCHAR(50) NOT NULL,
    mensagem    TEXT NOT NULL,
    status      VARCHAR(20) DEFAULT 'ativo'
                    CHECK (status IN ('ativo','suprimido','resolvido')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Frontend (Storefront + Admin Dashboard)

### Decisoes aprovadas

| # | Problema | Decisao |
|---|----------|---------|
| F1 | Admin descrito como "SPA" mas App Router usa Server Components | **Usar Server Components para layout e data fetching do admin.** Apenas graficos interativos e filtros em tempo real como Client Components. Nao e SPA puro. |
| F2 | JWT storage indefinido (cookie vs localStorage) | **Cookie HttpOnly + SameSite=Lax.** Next.js route handlers em `/app/api/` fazem proxy das chamadas ao FastAPI, eliminando problemas de CORS. |
| F3 | Sem state management para dashboard | **URL search params como source of truth** para filtros (useSearchParams). Server Components fazem o fetch. Sem biblioteca extra de state management no MVP. |

### Impacto na estrutura do frontend

```
src/app/
  api/                    # NOVO: route handlers proxy para FastAPI
    auth/login/route.ts   # POST → FastAPI /api/v1/auth/login, seta cookie
    auth/logout/route.ts  # POST → FastAPI /api/v1/auth/logout, limpa cookie
    [...path]/route.ts    # Proxy generico para /api/v1/*
  concurso/[slug]/
    page.tsx              # Server Component (SSR) — sem mudanca
    components/
      CountdownTimer.tsx  # Client Component — sem mudanca
      LeadCaptureForm.tsx # Client Component — sem mudanca
  admin/
    layout.tsx            # Server Component — verifica cookie JWT no server
    dashboard/page.tsx    # Server Component — fetch metricas no server
    metricas/page.tsx     # Server Component + Client Component para graficos
    testes-ab/page.tsx    # Server Component + Client Component para comparacao
    alertas/page.tsx      # Server Component
```

---

## 4. Testes e Propriedades

### Decisoes aprovadas

| # | Problema | Decisao |
|---|----------|---------|
| T1 | `.example()` dentro de `@given` no teste de idempotencia | **Corrigir:** mover numero de repeticoes para parametro do `@given` como `n_vezes=st.integers(min_value=1, max_value=5)`. |
| T2 | `asyncio.sleep(0.1)` no teste de integracao | **Corrigir:** usar polling com backoff curto (10ms) ate timeout de 5s. Ou injetar entrega service como sincrono nos testes. |
| T3 | Propriedade 18 usa CPA fixo como criterio de vencedor | **Corrigir:** vencedor = variante com melhor valor da `metrica_primaria` configurada (menor para CPL/CPA, maior para CTR/ROAS). |
| T4 | Sem testes para novos campos (UTMs, cidade/estado) | **Adicionar 2 propriedades:** (1) UTMs preservados no round-trip lead captura → consulta. (2) Filtro por cidade/estado retorna apenas concursos da regiao. |
| T5 | Propriedade 12 nao impede insercao de dados invalidos | **Corrigir:** adicionar validacao no Pydantic schema `CampanhaMetricaCreate`: `cliques <= impressoes`, `visitantes_lp <= cliques`, `leads <= visitantes_lp`, `vendas <= leads`. |

### Teste de idempotencia corrigido

```python
# Feature: concurseiro-saas, Property 5: Idempotencia de Webhook de Pagamento
@given(
    webhook_payload=st.builds(KiwifyWebhookFactory),
    n_vezes=st.integers(min_value=1, max_value=5)
)
@settings(max_examples=100)
def test_webhook_idempotencia(webhook_payload, n_vezes):
    """Processar o mesmo webhook N vezes resulta em exatamente 1 entrega."""
    db = criar_db_em_memoria()
    for _ in range(n_vezes):
        process_kiwify_webhook(webhook_payload, db)
    entregas = db.query(Entrega).filter_by(pedido_id=webhook_payload.order_id).all()
    assert len(entregas) == 1
```

### Propriedade 18 corrigida

```python
# Feature: concurseiro-saas, Property 18: Decisao Correta de Vencedor A/B
# Vencedor = variante com melhor valor da metrica_primaria:
#   - menor para CPL, CPA
#   - maior para CTR, ROAS
METRICA_DIRECAO = {"ctr": "maior", "roas": "maior", "cpl": "menor", "cpa": "menor"}
```

### Propriedades novas (28 e 29)

```
Propriedade 28: UTMs preservados no round-trip
  Para qualquer Lead criado com utm_source, utm_medium, utm_campaign,
  a consulta GET /api/v1/leads/{id} deve retornar os mesmos valores.

Propriedade 29: Filtro regional de concursos
  Para qualquer conjunto de concursos com cidades distintas,
  filtrar por cidade=X deve retornar apenas concursos onde cidade=X.
```

### Validacao do funil no Pydantic (Propriedade 12)

```python
class CampanhaMetricaCreate(BaseModel):
    impressoes: int = 0
    cliques: int = 0
    visitantes_lp: int = 0
    leads: int = 0
    vendas_ebook: int = 0
    vendas_pacote: int = 0

    @model_validator(mode='after')
    def validar_funil(self):
        vendas = self.vendas_ebook + self.vendas_pacote
        if self.cliques > self.impressoes:
            raise ValueError("cliques nao pode ser maior que impressoes")
        if self.visitantes_lp > self.cliques:
            raise ValueError("visitantes_lp nao pode ser maior que cliques")
        if self.leads > self.visitantes_lp:
            raise ValueError("leads nao pode ser maior que visitantes_lp")
        if vendas > self.leads:
            raise ValueError("vendas nao pode ser maior que leads")
        return self
```

---

## Resumo de todas as alteracoes ao design original

| Categoria | Alteracoes | Qtd |
|-----------|-----------|-----|
| Arquitetura/Deploy | Neon Postgres, Upstash Redis, 2 servicos Railway, APScheduler retries, retry simples sem circuit breaker | 6 |
| Modelos de Dados | UNIQUE leads, UTMs, lead_id nullable, alertas FK, editais UNIQUE, cidade/estado, tabela cupons | 7 |
| Frontend | Server Components no admin, Cookie HttpOnly, URL search params, route handlers proxy | 3 |
| Testes | Fix .example(), fix asyncio.sleep, Prop 12 validacao entrada, Prop 18 metrica dinamica, Props 28-29 novas | 5 |
| **Total** | | **21** |
