import React from "react";
import { LucideIcon } from "lucide-react";

interface AnalyticsMetricCardProps {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  value: string | number;
  subtitle: string;
}

export const AnalyticsMetricCard: React.FC<AnalyticsMetricCardProps> = ({
  title,
  icon: Icon,
  iconColor = "text-primary-text",
  value,
  subtitle,
}) => {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between text-muted">
        <span className="text-xs font-semibold uppercase">{title}</span>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="mt-3 text-2xl font-extrabold text-foreground">{value}</div>
      <div className="text-xs text-muted mt-1">{subtitle}</div>
    </div>
  );
};
