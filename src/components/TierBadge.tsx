import { Crown, Star, Gem, Users } from 'lucide-react';

interface TierBadgeProps {
  tier: 'select' | 'premier' | 'elite' | 'household';
  className?: string;
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  const tierConfig = {
    select: { label: 'Select', Icon: Star },
    premier: { label: 'Premier', Icon: Crown },
    elite: { label: 'Elite', Icon: Gem },
    household: { label: 'Household', Icon: Users },
  };

  const config = tierConfig[tier];
  const IconComponent = config.Icon;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <IconComponent className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm font-serif font-medium text-foreground">
        {config.label}
      </span>
    </div>
  );
}
