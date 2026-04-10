import PricingCard from "@/components/PricingCard";
import PublicFooter from "@/components/PublicFooter";

const plans = [
  {
    name: "Grátis",
    price: "R$0",
    description: "Comece a estudar sem compromisso.",
    features: [
      "Acesso a concursos públicos básicos",
      "Alertas de editais (até 3 por mês)",
      "Resumos simplificados",
      "Acesso à comunidade",
    ],
    cta_label: "Começar Grátis",
    cta_href: "/signup",
    highlighted: false,
  },
  {
    name: "Essencial",
    price: "R$29,90/mês",
    description: "A escolha mais popular para quem está focado em passar.",
    features: [
      "Tudo do plano Grátis",
      "Alertas ilimitados de editais",
      "Análise completa de banca e matérias",
      "Cronograma personalizado de estudos",
      "Simulados por concurso",
      "Suporte por e-mail",
    ],
    cta_label: "Assinar Essencial",
    cta_href: "/signup?plan=essencial",
    highlighted: true,
  },
  {
    name: "Premium",
    price: "R$49,90/mês",
    description: "Para o candidato que não aceita ficar de fora.",
    features: [
      "Tudo do plano Essencial",
      "IA de correção de redação",
      "Acompanhamento de recurso de prova",
      "Painel comparativo entre concursos",
      "Acesso antecipado a novos recursos",
      "Suporte prioritário via chat",
    ],
    cta_label: "Assinar Premium",
    cta_href: "/signup?plan=premium",
    highlighted: false,
  },
];

const faqs = [
  {
    question: "Posso cancelar a qualquer momento?",
    answer:
      "Sim. Você pode cancelar sua assinatura a qualquer momento pelo painel de conta, sem multas ou burocracias. O acesso continua até o fim do período pago.",
  },
  {
    question: "Como funciona o período de avaliação?",
    answer:
      "O plano Grátis não tem prazo de expiração. Para os planos pagos, a cobrança começa imediatamente após a confirmação do pagamento.",
  },
  {
    question: "Quais formas de pagamento são aceitas?",
    answer:
      "Aceitamos cartão de crédito (Visa, Mastercard, Elo, Amex), Pix e boleto bancário via nossa plataforma de pagamentos segura.",
  },
  {
    question: "Posso mudar de plano depois?",
    answer:
      "Sim. Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. O valor é calculado proporcionalmente ao período restante.",
  },
  {
    question: "Os dados do meu cartão ficam seguros?",
    answer:
      "Seus dados de pagamento são processados diretamente pela Stripe, líder global em pagamentos online. O Concurseiro PRO nunca armazena dados do seu cartão.",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="editorial-gradient px-4 py-24 text-center">
        <h1 className="font-headline mx-auto max-w-2xl text-5xl font-extrabold text-on-surface">
          Planos e Preços
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-on-surface-variant">
          Escolha o plano ideal para a sua jornada rumo à aprovação. Sem letras
          miúdas, sem surpresas.
        </p>
      </section>

      {/* Pricing Cards */}
      <section
        aria-label="Planos disponíveis"
        className="mx-auto max-w-6xl px-4 py-20"
      >
        <div className="grid gap-8 md:grid-cols-3 md:items-start">
          {plans.map((plan) => (
            <PricingCard key={plan.name} {...plan} />
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section
        aria-labelledby="faq-heading"
        className="mx-auto max-w-3xl px-4 pb-24"
      >
        <h2
          id="faq-heading"
          className="font-headline mb-10 text-center text-3xl font-bold text-on-surface"
        >
          Perguntas Frequentes
        </h2>

        <div className="glass-panel space-y-0 divide-y divide-outline-variant/20 rounded-2xl overflow-hidden">
          {faqs.map((faq) => (
            <details key={faq.question} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-on-surface marker:hidden">
                {faq.question}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-primary transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
