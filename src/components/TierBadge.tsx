import { Badge } from '@/components/ui/badge';

interface TierBadgeProps {
  tier: 'select' | 'premier' | 'elite' | 'household';
  className?: string;
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  const tierConfig = {
    select: { label: 'Select', color: 'bg-tier-select' },
    premier: { label: 'Premier', color: 'bg-tier-premier' },
    elite: { label: 'Elite', color: 'bg-tier-elite' },
    household: { label: 'Household', color: 'bg-tier-household' },
  };

  const config = tierConfig[tier];

  return (
    <Badge className={`${config.color} text-white border-0 ${className}`}>
      {config.label}
    </Badge>
  );
}
