import { InputHTMLAttributes, forwardRef } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={`w-full rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm text-ink placeholder:text-blue-300 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors ${className}`}
        {...rest}
      />
    );
  }
);
