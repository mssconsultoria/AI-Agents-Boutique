"""Servico de calculo de significancia estatistica para testes A/B."""
from typing import Optional

import numpy as np
from scipy.stats import chi2_contingency


def calcular_significancia(
    conv_a: int,
    total_a: int,
    conv_b: int,
    total_b: int,
) -> dict:
    """Calcula significancia estatistica usando chi-quadrado.

    Returns dict com chi2, p_value, significativo, dados_suficientes.
    """
    dados_suficientes = conv_a >= 30 and conv_b >= 30

    # Tabela de contingencia 2x2
    # [[conv_a, nao_conv_a], [conv_b, nao_conv_b]]
    nao_conv_a = total_a - conv_a
    nao_conv_b = total_b - conv_b

    # Evitar valores negativos
    if nao_conv_a < 0 or nao_conv_b < 0 or total_a <= 0 or total_b <= 0:
        return {
            "chi2": 0.0,
            "p_value": 1.0,
            "significativo": False,
            "dados_suficientes": dados_suficientes,
        }

    tabela = np.array([[conv_a, nao_conv_a], [conv_b, nao_conv_b]])

    # Se alguma coluna toda zero, nao da pra calcular
    if tabela.sum(axis=0).min() == 0 or tabela.sum(axis=1).min() == 0:
        return {
            "chi2": 0.0,
            "p_value": 1.0,
            "significativo": False,
            "dados_suficientes": dados_suficientes,
        }

    chi2, p_value, dof, expected = chi2_contingency(tabela, correction=False)

    return {
        "chi2": float(chi2),
        "p_value": float(p_value),
        "significativo": p_value < 0.05,
        "dados_suficientes": dados_suficientes,
    }


def determinar_vencedor(
    metrica_primaria: str,
    valor_a: float,
    valor_b: float,
    significativo: bool,
    dados_suficientes: bool,
) -> Optional[str]:
    """Determina vencedor do teste A/B.

    - "menor" eh melhor para CPL/CPA
    - "maior" eh melhor para CTR/ROAS
    - So declara vencedor se significativo=True E dados_suficientes=True
    """
    if not significativo or not dados_suficientes:
        return None

    metricas_menor_melhor = {"cpl", "cpa"}
    metricas_maior_melhor = {"ctr", "roas"}

    metrica = metrica_primaria.lower()

    if metrica in metricas_menor_melhor:
        if valor_a < valor_b:
            return "A"
        elif valor_b < valor_a:
            return "B"
        return None
    elif metrica in metricas_maior_melhor:
        if valor_a > valor_b:
            return "A"
        elif valor_b > valor_a:
            return "B"
        return None

    return None
