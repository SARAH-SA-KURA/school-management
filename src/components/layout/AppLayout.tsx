import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useTheme } from '../../contexts/ThemeContext';

const AppLayout: React.FC = () => {
  const { isDark } = useTheme();
  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <Sidebar />
      <div className="ml-56">
        <Header />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
