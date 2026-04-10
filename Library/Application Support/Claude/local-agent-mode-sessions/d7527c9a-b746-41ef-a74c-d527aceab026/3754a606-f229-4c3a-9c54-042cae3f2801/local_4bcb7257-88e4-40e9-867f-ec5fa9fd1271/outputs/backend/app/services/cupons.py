from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.cupom import Cupom


def aplicar_cupom(preco: Decimal, codigo: str, db: Session) -> dict:
    """Aplica cupom ao preco e retorna valor_final, desconto e erro."""
    cupom = db.query(Cupom).filter_by(codigo=codigo).first()

    if not cupom:
        return {"valor_final": preco, "desconto": Decimal("0"), "erro": "CUPOM_INVALIDO"}

    # Verificar se expirado ou inativo
    now = datetime.now(timezone.utc)
    valido_ate = cupom.valido_ate
    if valido_ate is not None and valido_ate.tzinfo is None:
        valido_ate = valido_ate.replace(tzinfo=timezone.utc)
    expirado = valido_ate is not None and valido_ate < now
    if expirado or not cupom.ativo:
        return {"valor_final": preco, "desconto": Decimal("0"), "erro": "CUPOM_EXPIRADO"}

    # Verificar usos
    if cupom.usos_max is not None and cupom.usos_atual >= cupom.usos_max:
        return {"valor_final": preco, "desconto": Decimal("0"), "erro": "CUPOM_ESGOTADO"}

    # Calcular desconto
    desconto = Decimal("0")
    if cupom.desconto_valor:
        desconto = Decimal(str(cupom.desconto_valor))
    elif cupom.desconto_percentual:
        desconto = preco * Decimal(str(cupom.desconto_percentual)) / Decimal("100")

    # Garantir que desconto nao exceda preco
    if desconto > preco:
        desconto = preco

    # Incrementar usos
    cupom.usos_atual = (cupom.usos_atual or 0) + 1
    db.commit()

    valor_final = preco - desconto
    return {"valor_final": valor_final, "desconto": desconto, "erro": None}
