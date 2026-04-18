import React from 'react';
import { HiSearch } from 'react-icons/hi';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Rechercher...',
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg pl-9 pr-3 py-1.5 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 outline-none placeholder-gray-400 dark:placeholder-gray-500"
      />
    </div>
  );
};

export default SearchInput;
