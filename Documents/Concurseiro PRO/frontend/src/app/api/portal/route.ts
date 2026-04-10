import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createStripeClient } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Você precisa estar autenticado para acessar o portal." },
        { status: 401 }
      );
    }

    const stripe = createStripeClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    // Mock: derive Stripe customerId from Clerk userId
    // In production, look up the real Stripe customerId from your database
    const customerId = `cus_${userId}`;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "resource_missing"
    ) {
      console.warn(
        "[Portal] Cliente Stripe não encontrado para este usuário."
      );
      return NextResponse.json(
        {
          error:
            "Nenhuma assinatura encontrada. Assine um plano para acessar o portal.",
        },
        { status: 404 }
      );
    }

    console.error("[Portal] Erro ao criar sessão do portal:", error);
    return NextResponse.json(
      { error: "Não foi possível abrir o portal. Tente novamente." },
      { status: 500 }
    );
  }
}
