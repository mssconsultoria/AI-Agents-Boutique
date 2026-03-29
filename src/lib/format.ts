export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatRelativeEnergy(energy: number) {
  if (energy >= 85) {
    return "high headroom";
  }
  if (energy >= 70) {
    return "steady";
  }
  return "strained";
}
