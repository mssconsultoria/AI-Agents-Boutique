"""Scraper stub para Instituto Mais."""
import logging
from typing import List

from app.services.scraper.base import EditalExtraido, ScraperBase

logger = logging.getLogger(__name__)


class InstitutoMaisScraper(ScraperBase):
    """Scraper para editais do Instituto Mais.

    Implementacao stub que demonstra o padrao.
    A logica real de parsing depende da estrutura do site alvo.
    """

    async def extrair(self, url: str) -> List[EditalExtraido]:
        """Extrai editais a partir de uma URL do Instituto Mais.

        Por enquanto retorna dados stub para demonstrar o padrao.
        Em producao usaria httpx + BeautifulSoup.
        """
        logger.info("Extraindo editais de %s", url)

        # Stub: retorna um edital de exemplo
        edital = EditalExtraido(
            orgao="Prefeitura de Exemplo",
            banca="Instituto Mais",
            ano=2026,
            numero_edital="01",
            nome="Concurso Prefeitura de Exemplo 2026",
            vagas=50,
            salario_min=2500.00,
            salario_max=8000.00,
            data_inscricao_inicio="2026-05-01",
            data_inscricao_fim="2026-05-30",
            data_prova="2026-07-15",
            data_resultado="2026-08-20",
            materias=["Portugues", "Matematica", "Conhecimentos Gerais"],
            link_original=url,
        )

        if not self.validar(edital):
            logger.warning("Edital extraido invalido: %s", edital.orgao)

        return [edital]
