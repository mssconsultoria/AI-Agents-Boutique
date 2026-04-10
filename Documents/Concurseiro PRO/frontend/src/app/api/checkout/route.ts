import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createStripeClient } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priceId } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: "O campo priceId é obrigatório." },
        { status: 400 }
      );
    }

    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Você precisa estar autenticado para assinar um plano." },
        { status: 401 }
      );
    }

    const stripe = createStripeClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?checkout=cancelled`,
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      metadata: {
        userId,
        priceId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[Checkout] Erro ao criar sessão:", error);
    return NextResponse.json(
      { error: "Não foi possível iniciar o checkout. Tente novamente." },
      { status: 500 }
    );
  }
}
