import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  variant?: 'filled' | 'outline';
}

export function Badge({ children, variant = 'filled' }: Props) {
  const classes =
    variant === 'filled'
      ? 'bg-blue-600 text-white'
      : 'bg-white text-blue-600 border border-blue-600';
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium ${classes}`}
    >
      {children}
    </span>
  );
}
