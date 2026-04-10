"use client";

interface PricingCardProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta_label: string;
  cta_href: string;
  highlighted?: boolean;
}

export default function PricingCard({
  name,
  price,
  description,
  features,
  cta_label,
  cta_href,
  highlighted = false,
}: PricingCardProps) {
  return (
    <div className={highlighted ? "card-highlighted relative" : "card-base relative"}>
      {highlighted && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold uppercase tracking-wider text-on-primary">
          Mais Popular
        </span>
      )}

      <div className="mb-6">
        <h3 className="font-headline text-xl font-bold text-on-surface">{name}</h3>
        <p className="mt-1 text-sm text-on-surface-variant">{description}</p>
      </div>

      <div className="mb-8">
        <span className="font-headline text-4xl font-extrabold text-on-surface">
          {price}
        </span>
      </div>

      <ul className="mb-8 space-y-[1.5rem]">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-on-surface-variant">
            <span className="mt-0.5 shrink-0 text-primary" aria-hidden="true">
              ✓
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {highlighted ? (
        <a
          href={cta_href}
          className="editorial-gradient block rounded-xl bg-primary px-6 py-3 text-center text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {cta_label}
        </a>
      ) : (
        <a
          href={cta_href}
          className="block border-b border-primary/30 px-6 py-3 text-center text-sm font-semibold text-primary transition-colors hover:border-primary/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {cta_label}
        </a>
      )}
    </div>
  );
}
