from datetime import date
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel


class ConcursoCreate(BaseModel):
    slug: str
    orgao: str
    banca: str
    cidade: Optional[str] = None
    estado: Optional[str] = None
    vagas: Optional[int] = None
    salario_min: Optional[float] = None
    salario_max: Optional[float] = None
    data_prova: Optional[date] = None
    data_inscricao_inicio: Optional[date] = None
    data_inscricao_fim: Optional[date] = None
    materias: Optional[dict] = None


class ProdutoResponse(BaseModel):
    id: UUID
    nome: str
    preco: float
    tipo: str
    destaque: bool

    model_config = {"from_attributes": True}


class ConcursoResponse(BaseModel):
    id: UUID
    slug: str
    orgao: str
    banca: str
    cidade: Optional[str] = None
    estado: Optional[str] = None
    vagas: Optional[int] = None
    salario_min: Optional[float] = None
    salario_max: Optional[float] = None
    data_prova: Optional[date] = None
    data_inscricao_inicio: Optional[date] = None
    data_inscricao_fim: Optional[date] = None
    countdown_ativo: bool = False
    dias_restantes: Optional[int] = None
    produtos: List[ProdutoResponse] = []

    model_config = {"from_attributes": True}
