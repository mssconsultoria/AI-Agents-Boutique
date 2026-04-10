"""Servico de alertas automaticos baseados em metricas de campanha."""
from datetime import date, timedelta
from typing import Optional, List

from sqlalchemy.orm import Session

from app.models.alerta import Alerta
from app.models.campanha_metrica import CampanhaMetrica
from app.services.metricas import calcular_metricas


# Definicao dos thresholds
THRESHOLDS = [
    {
        "tipo": "ctr_baixo",
        "metrica": "ctr",
        "operador": "menor",
        "limite": 0.8,
        "janela_dias": 1,
        "min_campo": "impressoes",
        "min_valor": 1000,
        "mensagem": "Pausar criativo",
    },
    {
        "tipo": "cpl_alto",
        "metrica": "cpl",
        "operador": "maior",
        "limite": 2.00,
        "janela_dias": 2,
        "min_campo": "leads",
        "min_valor": 10,
        "mensagem": "Revisar publico",
    },
    {
        "tipo": "cpa_alto",
        "metrica": "cpa",
        "operador": "maior",
        "limite": 15.00,
        "janela_dias": 2,
        "min_campo": "vendas",
        "min_valor": 5,
        "mensagem": "Pausar anuncio",
    },
    {
        "tipo": "roas_baixo",
        "metrica": "roas",
        "operador": "menor",
        "limite": 2.0,
        "janela_dias": 7,
        "min_campo": "gasto",
        "min_valor": 50.0,
        "mensagem": "Ajustar segmentacao",
    },
]


def avaliar_alertas(
    db: Session,
    campanha: str,
    concurso_id: Optional[str] = None,
    data_referencia: Optional[date] = None,
    campanha_pausada: bool = False,
) -> List[Alerta]:
    """Avalia metricas agregadas e gera alertas se thresholds forem violados.

    - Se campanha pausada, suprime alerta (nao cria).
    - Se alerta identico ativo ja existe, nao duplica.
    """
    if data_referencia is None:
        data_referencia = date.today()

    alertas_criados = []

    for th in THRESHOLDS:
        data_inicio = data_referencia - timedelta(days=th["janela_dias"])

        query = db.query(CampanhaMetrica).filter(
            CampanhaMetrica.campanha == campanha,
            CampanhaMetrica.data >= data_inicio,
            CampanhaMetrica.data <= data_referencia,
        )
        if concurso_id:
            query = query.filter(CampanhaMetrica.concurso_id == concurso_id)

        metricas = query.all()
        if not metricas:
            continue

        # Agregar dados da janela
        total_gasto = float(sum(float(m.gasto or 0) for m in metricas))
        total_impressoes = sum(m.impressoes or 0 for m in metricas)
        total_cliques = sum(m.cliques or 0 for m in metricas)
        total_leads = sum(m.leads or 0 for m in metricas)
        total_vendas = sum((m.vendas_ebook or 0) + (m.vendas_pacote or 0) for m in metricas)
        total_receita = float(sum(float(m.receita or 0) for m in metricas))

        # Verificar volume minimo
        min_campo = th["min_campo"]
        if min_campo == "impressoes" and total_impressoes < th["min_valor"]:
            continue
        elif min_campo == "leads" and total_leads < th["min_valor"]:
            continue
        elif min_campo == "vendas" and total_vendas < th["min_valor"]:
            continue
        elif min_campo == "gasto" and total_gasto < th["min_valor"]:
            continue

        # Calcular metrica
        calc = calcular_metricas(total_gasto, total_impressoes, total_cliques, total_leads, total_vendas, total_receita)
        valor_metrica = getattr(calc, th["metrica"])
        if valor_metrica is None:
            continue

        # Verificar violacao do threshold
        violacao = False
        if th["operador"] == "menor" and valor_metrica < th["limite"]:
            violacao = True
        elif th["operador"] == "maior" and valor_metrica > th["limite"]:
            violacao = True

        if not violacao:
            continue

        # Campanha pausada: suprimir
        if campanha_pausada:
            continue

        # Verificar duplicidade: alerta ativo do mesmo tipo para mesma campanha
        existente = db.query(Alerta).filter(
            Alerta.campanha == campanha,
            Alerta.tipo == th["tipo"],
            Alerta.status == "ativo",
        ).first()
        if existente:
            continue

        alerta = Alerta(
            campanha=campanha,
            concurso_id=concurso_id,
            tipo=th["tipo"],
            mensagem=th["mensagem"],
            status="ativo",
        )
        db.add(alerta)
        db.flush()
        alertas_criados.append(alerta)

    if alertas_criados:
        db.commit()

    return alertas_criados
