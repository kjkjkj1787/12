import React from 'react';
import { AlertTriangle, LayoutDashboard, Package, ShieldCheck } from 'lucide-react';

export type TabType = 'defect' | 'dashboard' | 'production' | 'admin';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  highSeverityCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  highSeverityCount = 0,
}) => {
  const tabs = [
    {
      id: 'defect' as TabType,
      label: '불량 입력',
      subtext: '현장 접수',
      icon: AlertTriangle,
    },
    {
      id: 'dashboard' as TabType,
      label: '대시보드',
      subtext: '현황 집계',
      icon: LayoutDashboard,
      badge: highSeverityCount > 0 ? highSeverityCount : undefined,
    },
    {
      id: 'production' as TabType,
      label: '생산 수량',
      subtext: '실적 마감',
      icon: Package,
    },
    {
      id: 'admin' as TabType,
      label: '관리·리포트',
      subtext: 'PIN 보호',
      icon: ShieldCheck,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg safe-bottom">
      <div className="max-w-md mx-auto grid grid-cols-4 h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center h-full transition-all active:scale-95 ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              style={{ minHeight: '48px', minWidth: '48px' }}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110' : ''
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-3.5 px-1.5 py-0.2 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-4 text-center leading-tight shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] tracking-tight mt-1 leading-none">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-6 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
