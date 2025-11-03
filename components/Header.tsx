
import React from 'react';
import { AppTab } from '../types';
import TabButton from './TabButton';
import { useAppContext } from '../context/AppContext';

const Header: React.FC = () => {
  const { appState, setAppState } = useAppContext();
  const { activeTab } = appState;

  const setActiveTab = (tab: AppTab) => {
    setAppState(prev => ({ ...prev, activeTab: tab }));
  };

  const tabs = Object.values(AppTab);

  return (
    <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10 shadow-lg shadow-gray-900/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between py-4">
          <h1 className="text-2xl font-bold text-white mb-4 sm:mb-0">
            AuraFrame <span className="text-purple-400">Studio</span>
          </h1>
          <nav className="flex flex-wrap justify-center gap-2">
            {tabs.map((tab) => (
              <TabButton
                key={tab}
                label={tab}
                isActive={activeTab === tab}
                onClick={() => setActiveTab(tab)}
              />
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
