import React from 'react';
import { Calendar, AlertCircle, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface MaturityCountdownProps {
  maturityDate: string;
  size?: 'sm' | 'md' | 'lg';
  showDate?: boolean;
}

export const MaturityCountdown: React.FC<MaturityCountdownProps> = ({
  maturityDate,
  size = 'md',
  showDate = false,
}) => {
  const now = new Date();
  const matDate = new Date(maturityDate);

  // Normalize to date boundary
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const matDateOnly = new Date(matDate.getFullYear(), matDate.getMonth(), matDate.getDate());
  const diffTime = matDateOnly.getTime() - nowDateOnly.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let badgeClass = '';
  let icon = Calendar;
  let text = '';
  let subtext = '';

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    badgeClass = 'bg-rose-50 text-rose-800 border-rose-300';
    icon = AlertTriangle;
    text = `${overdueDays}d Overdue`;
    subtext = 'Maturity Overdue';
  } else if (diffDays === 0) {
    badgeClass = 'bg-rose-100 text-rose-900 border-rose-400 font-semibold animate-pulse';
    icon = AlertCircle;
    text = 'Matures Today';
    subtext = 'Action Required';
  } else if (diffDays <= 7) {
    badgeClass = 'bg-orange-50 text-orange-800 border-orange-300 font-medium';
    icon = Clock;
    text = `${diffDays}d Left (Critical)`;
    subtext = 'Under 7 Days';
  } else if (diffDays <= 30) {
    badgeClass = 'bg-amber-50 text-amber-800 border-amber-300';
    icon = Clock;
    text = `${diffDays}d Left`;
    subtext = 'Under 30 Days';
  } else if (diffDays <= 90) {
    badgeClass = 'bg-blue-50 text-blue-800 border-blue-200';
    icon = Calendar;
    text = `${diffDays}d Left`;
    subtext = 'Under 90 Days';
  } else {
    badgeClass = 'bg-slate-50 text-slate-700 border-slate-200';
    icon = Calendar;
    text = `${diffDays}d Left`;
    subtext = 'Healthy Tenure';
  }

  const IconComponent = icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size];

  const formattedDate = matDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <span
      className={`inline-flex items-center rounded-md border ${badgeClass} ${sizeClasses}`}
      title={`Maturity Date: ${formattedDate} (${subtext})`}
    >
      <IconComponent className="w-3.5 h-3.5 shrink-0" />
      <span>{text}</span>
      {showDate && <span className="text-slate-400 ml-1">({formattedDate})</span>}
    </span>
  );
};
