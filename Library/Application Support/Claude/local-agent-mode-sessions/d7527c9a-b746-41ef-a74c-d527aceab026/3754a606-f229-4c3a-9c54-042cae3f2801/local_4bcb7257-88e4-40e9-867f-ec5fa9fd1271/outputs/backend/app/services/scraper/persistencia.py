"""Persistencia de editais extraidos."""
import logging
from datetime import date
from decimal import Decimal
from typing import Dict, List

from sqlalchemy.orm import Session

from app.models.edital import Edital
from app.services.scraper.base import EditalExtraido, ScraperBase

logger = logging.getLogger(__name__)

# Instancia validador reutilizavel
_validador = type("_V", (ScraperBase,), {"extrair": None})()


def _parse_date(val: str) -> date:
    """Converte string ISO para date."""
    if val is None:
        return None
    return date.fromisoformat(val)


def salvar_editais(editais: List[EditalExtraido], db: Session) -> Dict[str, int]:
    """Salva editais no banco. Retorna contagem de novos vs pulados.

    Para cada edital:
    - Valida com ScraperBase.validar
    - INSERT se nao existir (ON CONFLICT DO NOTHING via check manual)
    """
    novos = 0
    pulados = 0

    for e in editais:
        if not _validador.validar(e):
            logger.warning("Edital invalido pulado: orgao=%s banca=%s", e.orgao, e.banca)
            pulados += 1
            continue

        # Verificar duplicata
        existente = db.query(Edital).filter_by(
            orgao=e.orgao,
            banca=e.banca,
            ano=e.ano,
            numero_edital=e.numero_edital or "01",
        ).first()

        if existente:
            pulados += 1
            continue

        edital_db = Edital(
            orgao=e.orgao,
            banca=e.banca,
            ano=e.ano,
            numero_edital=e.numero_edital or "01",
            nome=e.nome,
            vagas=e.vagas,
            salario_min=Decimal(str(e.salario_min)) if e.salario_min is not None else None,
            salario_max=Decimal(str(e.salario_max)) if e.salario_max is not None else None,
            data_inscricao_inicio=_parse_date(e.data_inscricao_inicio),
            data_inscricao_fim=_parse_date(e.data_inscricao_fim),
            data_prova=_parse_date(e.data_prova),
            data_resultado=_parse_date(e.data_resultado),
            materias=e.materias,
            link_original=e.link_original,
            fonte="scraper",
        )
        db.add(edital_db)
        novos += 1

    if novos > 0:
        db.commit()

    return {"novos": novos, "pulados": pulados}
