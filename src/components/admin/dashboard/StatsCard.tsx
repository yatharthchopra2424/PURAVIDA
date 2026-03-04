import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
  accentColor?: "emerald" | "blue" | "orange" | "red" | "purple";
}

const colorMap = {
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    iconBg: "bg-emerald-500/20",
    iconText: "text-emerald-400",
    trendUp: "text-emerald-400",
  },
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    iconBg: "bg-blue-500/20",
    iconText: "text-blue-400",
    trendUp: "text-blue-400",
  },
  orange: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    iconBg: "bg-orange-500/20",
    iconText: "text-orange-400",
    trendUp: "text-orange-400",
  },
  red: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    iconBg: "bg-red-500/20",
    iconText: "text-red-400",
    trendUp: "text-red-400",
  },
  purple: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    iconBg: "bg-purple-500/20",
    iconText: "text-purple-400",
    trendUp: "text-purple-400",
  },
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  accentColor = "emerald",
}: StatsCardProps) {
  const colors = colorMap[accentColor];

  return (
    <div
      className={`rounded-2xl border ${colors.border} bg-zinc-900 p-5 flex flex-col gap-4`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-xl ${colors.iconBg} flex items-center justify-center`}
        >
          <Icon className={`w-5 h-5 ${colors.iconText}`} />
        </div>
        {trend && (
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full bg-zinc-800 ${
              trend.value >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value} {trend.label}
          </span>
        )}
      </div>

      <div>
        <p className="text-3xl font-heading font-bold text-white">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <p className="text-zinc-400 text-sm mt-1">{title}</p>
        {description && (
          <p className="text-zinc-600 text-xs mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}
