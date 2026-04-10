import { NextRequest, NextResponse } from "next/server";
import { createStripeClient } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("[Stripe Webhook] Assinatura ausente no header.");
    return NextResponse.json(
      { error: "Assinatura do webhook ausente." },
      { status: 400 }
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET não configurado.");
    return NextResponse.json(
      { error: "Configuração do webhook inválida." },
      { status: 500 }
    );
  }

  const stripe = createStripeClient();
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("[Stripe Webhook] Falha na verificação da assinatura:", error);
    return NextResponse.json(
      { error: "Assinatura do webhook inválida." },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log(
          "[Stripe Webhook] checkout.session.completed — sessionId:",
          session.id,
          "userId:",
          session.metadata?.userId,
          "priceId:",
          session.metadata?.priceId
        );
        // TODO: Ativar assinatura do usuário no banco de dados
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        console.log(
          "[Stripe Webhook] customer.subscription.updated — subscriptionId:",
          subscription.id,
          "status:",
          subscription.status
        );
        // TODO: Atualizar status da assinatura no banco de dados
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        console.log(
          "[Stripe Webhook] customer.subscription.deleted — subscriptionId:",
          subscription.id,
          "customerId:",
          subscription.customer
        );
        // TODO: Cancelar acesso premium do usuário no banco de dados
        break;
      }

      default:
        console.log("[Stripe Webhook] Evento não tratado:", event.type);
    }
  } catch (error) {
    console.error("[Stripe Webhook] Erro ao processar evento:", event.type, error);
    return NextResponse.json(
      { error: "Erro interno ao processar o evento." },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
