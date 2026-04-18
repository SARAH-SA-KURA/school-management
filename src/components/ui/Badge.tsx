import React from 'react';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'gray';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400',
  success: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400',
  warning: 'bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400',
  danger: 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400',
  gray: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
};

const Badge: React.FC<BadgeProps> = ({ children, variant = 'gray', className = '' }) => {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
