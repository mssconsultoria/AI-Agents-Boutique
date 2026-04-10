"use client";

import { useState } from "react";
import Link from "next/link";
import PublicFooter from "@/components/PublicFooter";

// ─── Data ────────────────────────────────────────────────────────────────────

const STATS = [
  { id: "questions", label: "+50.000 questões", sub: "curadas e comentadas" },
  { id: "satisfaction", label: "98% satisfação", sub: "entre usuários ativos" },
  { id: "contests", label: "200+ concursos", sub: "monitorados em tempo real" },
];

const STEPS = [
  {
    id: "choose",
    number: "01",
    title: "Escolha seu concurso",
    body: "Selecione entre mais de 200 editais monitorados. Receba alertas imediatos sobre abertura e alterações.",
  },
  {
    id: "study",
    number: "02",
    title: "Estude com questões reais",
    body: "Acesse banco com +50.000 questões originais de bancas, todas com gabarito e comentário fundamentado.",
  },
  {
    id: "track",
    number: "03",
    title: "Acompanhe seu progresso",
    body: "Dashboards analíticos mostram seus pontos fortes, lacunas e projeção de aprovação por disciplina.",
  },
];

const FEATURES = [
  {
    id: "editais",
    icon: "notifications_active",
    title: "Editais Monitorados",
    body: "Scraping automatizado de editais. Alertas por e-mail e push assim que um novo concurso abre.",
  },
  {
    id: "questoes",
    icon: "quiz",
    title: "Questões Comentadas",
    body: "Banco atualizado com questões de bancas como CEBRASPE, FCC e FGV, com comentários de especialistas.",
  },
  {
    id: "analytics",
    icon: "analytics",
    title: "Analytics PRO",
    body: "Relatórios de desempenho por disciplina, banca e nível de dificuldade. Veja onde focar sua energia.",
  },
  {
    id: "plan",
    icon: "calendar_month",
    title: "Plano Personalizado",
    body: "IA gera cronograma de estudos baseado na data da prova, carga horária disponível e histórico seu.",
  },
];

const PLANS = [
  {
    id: "free",
    name: "Grátis",
    price: "R$ 0",
    period: "",
    features: ["50 questões/mês", "1 concurso monitorado", "Relatório básico"],
    highlighted: false,
  },
  {
    id: "essencial",
    name: "Essencial",
    price: "R$ 29,90",
    period: "/mês",
    features: [
      "5.000 questões/mês",
      "10 concursos monitorados",
      "Analytics avançado",
      "Alertas de edital",
    ],
    highlighted: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: "R$ 49,90",
    period: "/mês",
    features: [
      "Questões ilimitadas",
      "Concursos ilimitados",
      "Analytics PRO completo",
      "Plano personalizado por IA",
      "Suporte prioritário",
    ],
    highlighted: false,
  },
];

const TESTIMONIALS = [
  {
    id: "ana",
    name: "Ana Beatriz S.",
    role: "Aprovada — TRT 15ª Região",
    quote:
      "O painel de analytics me mostrou exatamente onde eu estava perdendo pontos em Direito Constitucional. Em três meses virei minha performance de cabeça para baixo.",
  },
  {
    id: "carlos",
    name: "Carlos M.",
    role: "Aprovado — INSS 2024",
    quote:
      "Os alertas de edital me salvaram — recebi a notificação do INSS antes de todo mundo e consegui me inscrever no prazo certo. Plataforma essencial.",
  },
  {
    id: "fernanda",
    name: "Fernanda R.",
    role: "Aprovada — PF Papiloscopista",
    quote:
      "As questões comentadas da CEBRASPE são incríveis. A explicação de cada alternativa errada foi o que me fez entender a lógica das provas de uma vez por todas.",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] uppercase tracking-[0.2em] text-primary font-medium mb-4">
      {children}
    </p>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  const prevTestimonial = () =>
    setTestimonialIndex((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  const nextTestimonial = () =>
    setTestimonialIndex((i) => (i + 1) % TESTIMONIALS.length);

  const current = TESTIMONIALS[testimonialIndex];

  return (
    <main className="min-h-screen bg-surface text-on-surface">

      {/* ── 1. Hero Split ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[92vh] flex items-center">
        {/* Background ambient gradients */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 80% 50%, rgba(200,169,110,0.07) 0%, transparent 70%), radial-gradient(ellipse 50% 80% at 10% 80%, rgba(200,169,110,0.04) 0%, transparent 60%)",
          }}
        />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-16 items-center py-24">
          {/* Left — copy */}
          <div className="flex flex-col gap-8">
            <SectionLabel>Concurseiro PRO · Aprovação garantida</SectionLabel>

            <h1 className="font-headline italic text-5xl lg:text-7xl leading-[1.05] text-on-surface">
              Sua aprovação
              <br />
              <span className="text-primary">começa aqui.</span>
            </h1>

            <p className="text-lg text-on-surface-variant leading-relaxed max-w-md">
              Questões reais, editais monitorados e analytics que revelam
              exatamente o que estudar. Tudo em uma plataforma construída para
              quem leva o concurso a sério.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-primary text-on-primary editorial-gradient font-semibold text-sm tracking-wide transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                Começar Grátis
                <span className="material-symbols-outlined text-base leading-none">
                  arrow_forward
                </span>
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-surface-container-high text-on-surface font-semibold text-sm tracking-wide hover:bg-surface-container-highest transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                Ver planos
              </Link>
            </div>
          </div>

          {/* Right — abstract decorative */}
          <div aria-hidden="true" className="hidden lg:flex items-center justify-center">
            <div className="relative w-[480px] h-[480px]">
              {/* Concentric rings built purely with tonal backgrounds */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "conic-gradient(from 200deg, rgba(200,169,110,0.12) 0deg, rgba(200,169,110,0.03) 120deg, rgba(200,169,110,0.10) 240deg, rgba(200,169,110,0.12) 360deg)",
                }}
              />
              <div
                className="absolute inset-[60px] rounded-full"
                style={{
                  background:
                    "conic-gradient(from 60deg, rgba(200,169,110,0.18) 0deg, rgba(200,169,110,0.04) 180deg, rgba(200,169,110,0.18) 360deg)",
                }}
              />
              <div
                className="absolute inset-[120px] rounded-full glass-panel flex items-center justify-center"
                style={{ backdropFilter: "blur(30px)" }}
              >
                <div className="text-center">
                  <p className="font-headline italic text-5xl text-primary leading-none">
                    PRO
                  </p>
                  <p className="text-[9px] uppercase tracking-[0.25em] text-on-surface-variant mt-2">
                    Concurseiro
                  </p>
                </div>
              </div>
              {/* Floating stats chips */}
              <div className="absolute top-8 right-0 glass-panel rounded-lg px-4 py-2">
                <p className="text-xs text-on-surface-variant">Aprovações hoje</p>
                <p className="font-headline text-2xl text-primary">47</p>
              </div>
              <div className="absolute bottom-12 left-0 glass-panel rounded-lg px-4 py-2">
                <p className="text-xs text-on-surface-variant">Taxa de acerto</p>
                <p className="font-headline text-2xl text-primary">82%</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Social Proof ───────────────────────────────────────────── */}
      <section className="bg-surface-container-low py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid sm:grid-cols-3 gap-6">
            {STATS.map((stat) => (
              <div key={stat.id} className="card-base p-8 text-center">
                <p className="font-headline italic text-4xl text-primary mb-2">
                  {stat.label}
                </p>
                <p className="text-sm text-on-surface-variant">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Como Funciona ──────────────────────────────────────────── */}
      <section className="py-28 max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-20 items-start">
          {/* Left — copy */}
          <div>
            <SectionLabel>Como funciona</SectionLabel>
            <h2 className="font-headline italic text-4xl lg:text-5xl text-on-surface mb-6">
              Três passos para a aprovação
            </h2>
            <p className="text-on-surface-variant leading-relaxed">
              Metodologia pensada para eliminar ruído e focar no que realmente
              cai nas provas. Do edital ao gabarito, tudo no mesmo lugar.
            </p>
          </div>

          {/* Right — steps */}
          <div className="flex flex-col gap-4">
            {STEPS.map((step) => (
              <div key={step.id} className="flex gap-6 items-start">
                {/* Number indicator — tonal layering, no borders */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-container flex items-center justify-center">
                  <span className="font-headline italic text-primary text-sm leading-none">
                    {step.number}
                  </span>
                </div>
                <div className="pt-1">
                  <h3 className="font-semibold text-on-surface mb-1">{step.title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Features ───────────────────────────────────────────────── */}
      <section className="bg-surface-container-low py-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <SectionLabel>Funcionalidades</SectionLabel>
            <h2 className="font-headline italic text-4xl lg:text-5xl text-on-surface">
              Tudo que você precisa, sem excesso
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {FEATURES.map((feat) => (
              <div key={feat.id} className="card-elevated p-8 flex gap-5 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-xl">
                    {feat.icon}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-on-surface mb-2">{feat.title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    {feat.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Pricing Preview ────────────────────────────────────────── */}
      <section className="py-28 max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-16">
          <SectionLabel>Planos</SectionLabel>
          <h2 className="font-headline italic text-4xl lg:text-5xl text-on-surface mb-4">
            Escolha seu ritmo
          </h2>
          <p className="text-on-surface-variant">
            Comece grátis. Evolua quando quiser.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={
                plan.highlighted
                  ? "card-highlighted p-8 flex flex-col gap-6"
                  : "card-base p-8 flex flex-col gap-6"
              }
            >
              {plan.highlighted && (
                <div className="inline-flex">
                  <span className="text-[9px] uppercase tracking-[0.2em] bg-primary-container text-primary px-3 py-1 rounded-full font-medium">
                    Mais popular
                  </span>
                </div>
              )}

              <div>
                <p className="text-sm text-on-surface-variant mb-1">{plan.name}</p>
                <p className="font-headline italic text-4xl text-on-surface">
                  {plan.price}
                  <span className="text-base text-on-surface-variant font-normal not-italic">
                    {plan.period}
                  </span>
                </p>
              </div>

              <ul className="flex flex-col gap-3">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-3 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary text-base leading-none flex-shrink-0">
                      check_circle
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>

              <Link
                href="/pricing"
                className={`mt-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm tracking-wide transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                  plan.highlighted
                    ? "bg-primary text-on-primary editorial-gradient"
                    : "bg-surface-container-highest text-on-surface hover:bg-surface-container-high"
                }`}
              >
                {plan.id === "free" ? "Começar grátis" : "Assinar agora"}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center mt-8 text-sm text-on-surface-variant">
          Veja detalhes completos em{" "}
          <Link
            href="/pricing"
            className="text-primary hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
          >
            /pricing
          </Link>
        </p>
      </section>

      {/* ── 6. Testimonials ───────────────────────────────────────────── */}
      <section className="bg-surface-container-low py-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <SectionLabel>Depoimentos</SectionLabel>
            <h2 className="font-headline italic text-4xl lg:text-5xl text-on-surface">
              Quem aprovou, recomenda
            </h2>
          </div>

          <div
            role="region"
            aria-live="polite"
            aria-label="Depoimentos de usuários aprovados"
            className="relative max-w-3xl mx-auto"
          >
            <div className="glass-panel rounded-2xl p-10 lg:p-14 text-center">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-primary text-4xl mb-6 block"
              >
                format_quote
              </span>
              <blockquote>
                <p className="font-headline italic text-xl lg:text-2xl text-on-surface leading-relaxed mb-8">
                  &ldquo;{current.quote}&rdquo;
                </p>
                <footer>
                  <p className="font-semibold text-on-surface text-sm">{current.name}</p>
                  <p className="text-on-surface-variant text-xs mt-1">{current.role}</p>
                </footer>
              </blockquote>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-center gap-6 mt-8">
              <button
                onClick={prevTestimonial}
                aria-label="Depoimento anterior"
                className="w-10 h-10 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low"
              >
                <span className="material-symbols-outlined text-base">chevron_left</span>
              </button>

              {/* Dots */}
              <div className="flex gap-2" role="tablist" aria-label="Navegar entre depoimentos">
                {TESTIMONIALS.map((t, idx) => (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={idx === testimonialIndex}
                    aria-label={`Depoimento ${idx + 1} de ${TESTIMONIALS.length}`}
                    onClick={() => setTestimonialIndex(idx)}
                    className={`rounded-full transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${
                      idx === testimonialIndex
                        ? "w-6 h-2 bg-primary"
                        : "w-2 h-2 bg-surface-container-highest hover:bg-on-surface-variant"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={nextTestimonial}
                aria-label="Próximo depoimento"
                className="w-10 h-10 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low"
              >
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. CTA Final ──────────────────────────────────────────────── */}
      <section className="py-28">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
          {/* Ambient glow — tonal, no border */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full"
            style={{
              background:
                "radial-gradient(ellipse, rgba(200,169,110,0.08) 0%, transparent 70%)",
            }}
          />

          <SectionLabel>Comece agora</SectionLabel>

          <h2 className="font-headline italic text-5xl lg:text-6xl text-on-surface mb-6">
            Pronto para começar?
          </h2>

          <p className="text-lg text-on-surface-variant max-w-xl mx-auto mb-10 leading-relaxed">
            Junte-se a mais de 50.000 concurseiros que já transformaram a forma
            de estudar. Sem cartão de crédito para começar.
          </p>

          <Link
            href="/signup"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-primary text-on-primary editorial-gradient font-semibold text-base tracking-wide transition-all shadow-lg hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-surface"
          >
            Criar conta grátis
            <span className="material-symbols-outlined text-lg leading-none">
              rocket_launch
            </span>
          </Link>

          <p className="mt-5 text-xs text-on-surface-variant">
            Grátis para sempre. Upgrade quando quiser.
          </p>
        </div>
      </section>

      {/* ── 8. Footer ─────────────────────────────────────────────────── */}
      <PublicFooter />
    </main>
  );
}
