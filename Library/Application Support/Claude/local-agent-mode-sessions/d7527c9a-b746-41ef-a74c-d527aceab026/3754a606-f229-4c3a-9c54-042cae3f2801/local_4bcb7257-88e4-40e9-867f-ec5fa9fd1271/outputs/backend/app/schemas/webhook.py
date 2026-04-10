from pydantic import BaseModel, EmailStr


class KiwifyWebhookPayload(BaseModel):
    order_id: str
    status: str
    product_id: str
    customer_email: EmailStr
    customer_name: str
    amount: float
    payment_method: str
