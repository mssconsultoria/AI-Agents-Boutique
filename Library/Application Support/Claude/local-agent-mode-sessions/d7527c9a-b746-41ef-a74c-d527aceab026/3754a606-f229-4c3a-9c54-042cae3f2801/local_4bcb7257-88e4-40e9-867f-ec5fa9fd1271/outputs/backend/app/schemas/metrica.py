"""Schemas Pydantic para metricas de campanha."""
import uuid
from datetime import date
from typing import Optional, List

from pydantic import BaseModel, model_validator


class CampanhaMetricaCreate(BaseModel):
    concurso_id: Optional[str] = None
    campanha: str
    variante: Optional[str] = None
    data: date
    gasto: float = 0
    impressoes: int = 0
    cliques: int = 0
    visitantes_lp: int = 0
    leads: int = 0
    vendas_ebook: int = 0
    vendas_pacote: int = 0
    receita: float = 0
    observacoes: Optional[str] = None

    @model_validator(mode="after")
    def validar_funil(self) -> "CampanhaMetricaCreate":
        if self.cliques > self.impressoes:
            raise ValueError("cliques nao pode ser maior que impressoes")
        if self.visitantes_lp > self.cliques:
            raise ValueError("visitantes_lp nao pode ser maior que cliques")
        if self.leads > self.visitantes_lp:
            raise ValueError("leads nao pode ser maior que visitantes_lp")
        total_vendas = self.vendas_ebook + self.vendas_pacote
        if total_vendas > self.leads:
            raise ValueError("total de vendas nao pode ser maior que leads")
        return self


class CampanhaMetricaOut(BaseModel):
    id: str
    concurso_id: Optional[str] = None
    campanha: str
    variante: Optional[str] = None
    data: date
    gasto: float
    impressoes: int
    cliques: int
    visitantes_lp: int
    leads: int
    vendas_ebook: int
    vendas_pacote: int
    receita: float
    observacoes: Optional[str] = None
    ctr: Optional[float] = None
    cpl: Optional[float] = None
    cpa: Optional[float] = None
    roas: Optional[float] = None
    cpc: Optional[float] = None

    model_config = {"from_attributes": True}
