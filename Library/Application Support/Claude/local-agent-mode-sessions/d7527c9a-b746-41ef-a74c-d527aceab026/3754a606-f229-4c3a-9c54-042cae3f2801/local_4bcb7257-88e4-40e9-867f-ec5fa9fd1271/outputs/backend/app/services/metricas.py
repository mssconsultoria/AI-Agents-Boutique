"""Servico de calculo de metricas de campanha."""
from dataclasses import dataclass
from typing import Optional


@dataclass
class MetricasCalculadas:
    ctr: Optional[float]
    cpl: Optional[float]
    cpa: Optional[float]
    roas: Optional[float]
    cpc: Optional[float]


def calcular_metricas(
    gasto: float,
    impressoes: int,
    cliques: int,
    leads: int,
    vendas: int,
    receita: float,
) -> MetricasCalculadas:
    """Calcula CTR, CPL, CPA, ROAS, CPC a partir de dados brutos.

    Retorna None para metricas onde divisao por zero ocorreria.
    """
    ctr = (cliques / impressoes) * 100 if impressoes > 0 else None
    cpl = gasto / leads if leads > 0 else None
    cpa = gasto / vendas if vendas > 0 else None
    roas = receita / gasto if gasto > 0 else None
    cpc = gasto / cliques if cliques > 0 else None

    return MetricasCalculadas(ctr=ctr, cpl=cpl, cpa=cpa, roas=roas, cpc=cpc)
