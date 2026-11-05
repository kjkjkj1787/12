import React, { useState, useEffect } from 'react';
import { ShieldCheck, FileSpreadsheet, RefreshCw, Clock } from 'lucide-react';
import { getCurrentTimestampString } from '../utils/date';

interface HeaderProps {
  activeTab: string;
  onOpenGasModal: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenGasModal,
  onRefresh,
  isRefreshing,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setTimeStr(`${hours}:${minutes}:${seconds}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm shrink-0">
            Q
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight leading-none text-white">
              라인별 불량률 리포트
            </span>
            <span className="text-[11px] text-slate-400 leading-tight mt-0.5">
              스마트 품질관리 웹앱
            </span>
          </div>
        </div>

        {/* Real-time Clock & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 text-slate-300 text-xs font-mono tabular-nums">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>KST {timeStr}</span>
          </div>

          <button
            onClick={onOpenGasModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            title="구글 시트 & Apps Script 배포 코드"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xs:inline">시트 연동</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
            title="데이터 새로고침"
            aria-label="새로고침"
          >
            <RefreshCw className={`w-4 h-4 text-slate-300 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
