import React, { createContext, useContext, useState, ReactNode } from 'react';

// Academic year flips in September (month index 8). Format: "YYYY-YYYY".
export const computeCurrentAcademicYear = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  return d.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};

const STORAGE_KEY = 'academic_year';

const DEFAULT_YEARS = (): string[] => {
  const current = computeCurrentAcademicYear();
  const [startStr] = current.split('-');
  const start = parseInt(startStr, 10);
  // 5 past + current + 1 future, oldest first
  const years: string[] = [];
  for (let i = -5; i <= 1; i++) {
    const s = start + i;
    years.push(`${s}-${s + 1}`);
  }
  return years;
};

interface Ctx {
  year: string;
  setYear: (y: string) => void;
  availableYears: string[];
}

const AcademicYearContext = createContext<Ctx | null>(null);

export const AcademicYearProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [year, setYearState] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    return computeCurrentAcademicYear();
  });

  const setYear = (y: string) => {
    setYearState(y);
    localStorage.setItem(STORAGE_KEY, y);
  };

  return (
    <AcademicYearContext.Provider value={{ year, setYear, availableYears: DEFAULT_YEARS() }}>
      {children}
    </AcademicYearContext.Provider>
  );
};

export const useAcademicYear = (): Ctx => {
  const ctx = useContext(AcademicYearContext);
  if (!ctx) throw new Error('useAcademicYear must be used within AcademicYearProvider');
  return ctx;
};
