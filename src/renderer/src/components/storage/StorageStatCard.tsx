import React from "react";
import { LucideIcon } from "lucide-react";

interface StorageStatCardProps {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  value: string;
  valueColor?: string;
  subtitle: string;
}

export const StorageStatCard: React.FC<StorageStatCardProps> = ({
  title,
  icon: Icon,
  iconColor = "text-primary-text",
  value,
  valueColor = "text-foreground",
  subtitle,
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          {title}
        </span>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className={`mt-4 text-3xl font-extrabold ${valueColor}`}>
        {value}
      </div>
      <div className="mt-2 text-xs text-muted">
        {subtitle}
      </div>
    </div>
  );
};
