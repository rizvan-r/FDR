import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'navy';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  const variantStyles = {
    success: 'bg-[#ECFDF3] text-[#027A48] border-[#A6F4C5]',
    warning: 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]',
    danger: 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]',
    info: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
    navy: 'bg-[#12345A]/10 text-[#12345A] border-[#12345A]/20',
    default: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
