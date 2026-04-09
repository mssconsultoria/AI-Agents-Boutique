"""Scraper base: dataclass EditalExtraido, classe abstrata ScraperBase."""
import json
from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass, field
from typing import List, Optional

from datetime import date


@dataclass
class EditalExtraido:
    orgao: str
    banca: str
    ano: int
    numero_edital: str = "01"
    nome: Optional[str] = None
    vagas: Optional[int] = None
    salario_min: Optional[float] = None
    salario_max: Optional[float] = None
    data_inscricao_inicio: Optional[str] = None
    data_inscricao_fim: Optional[str] = None
    data_prova: Optional[str] = None
    data_resultado: Optional[str] = None
    materias: Optional[List[str]] = None
    link_original: Optional[str] = None


class ScraperBase(ABC):
    @abstractmethod
    async def extrair(self, url: str) -> List[EditalExtraido]:
        ...

    def validar(self, edital: EditalExtraido) -> bool:
        """Retorna True se orgao, banca e data_prova estao presentes."""
        return bool(edital.orgao and edital.banca and edital.data_prova)


def pretty_print_edital(edital: EditalExtraido) -> str:
    """Serializa EditalExtraido para JSON canonical."""
    return json.dumps(asdict(edital), sort_keys=True, indent=2, ensure_ascii=False)


def parse_edital(json_str: str) -> EditalExtraido:
    """Deserializa JSON para EditalExtraido."""
    data = json.loads(json_str)
    return EditalExtraido(**data)
