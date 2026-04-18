import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  onIconRightClick?: () => void;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, iconRight, onIconRightClick, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full px-3 py-2.5 border rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
              placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-200
              dark:bg-gray-800 dark:text-gray-100
              ${icon ? 'pl-10' : ''}
              ${iconRight ? 'pr-10' : ''}
              ${error ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500' : 'border-gray-300 dark:border-gray-600'}
              ${className}`}
            {...props}
          />
          {iconRight && (
            <div
              className={`absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 ${onIconRightClick ? 'cursor-pointer hover:text-gray-600 dark:hover:text-gray-300' : 'pointer-events-none'}`}
              onClick={onIconRightClick}
            >
              {iconRight}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
