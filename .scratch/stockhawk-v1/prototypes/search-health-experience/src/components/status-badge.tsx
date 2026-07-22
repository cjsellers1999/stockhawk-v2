interface StatusBadgeProps {
  children: React.ReactNode;
  tone?: string;
}

function normalizeTone(value: string): string {
  return value.toLowerCase().replaceAll(" ", "-");
}

export function StatusBadge({ children, tone }: StatusBadgeProps) {
  const toneName = tone ?? String(children);
  return <span className={`status-badge tone-${normalizeTone(toneName)}`}>{children}</span>;
}
