interface TierBadgeProps {
  tier: 'select' | 'premier' | 'elite' | 'household';
  className?: string;
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  const tierConfig = {
    select: { label: 'Select', dotColor: 'bg-tier-select', textColor: 'text-tier-select' },
    premier: { label: 'Premier', dotColor: 'bg-tier-premier', textColor: 'text-tier-premier' },
    elite: { label: 'Elite', dotColor: 'bg-tier-elite', textColor: 'text-tier-elite' },
    household: { label: 'Household', dotColor: 'bg-tier-household', textColor: 'text-tier-household' },
  };

  const config = tierConfig[tier];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
      <span className={`text-sm font-serif font-medium ${config.textColor}`}>
        {config.label}
      </span>
    </div>
  );
}
