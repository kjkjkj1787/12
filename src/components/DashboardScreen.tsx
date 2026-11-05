import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  RotateCw,
  TrendingDown,
  Calendar,
  Layers,
  ChevronRight,
  ShieldAlert,
  Info,
  CheckCircle,
} from 'lucide-react';
import { DashboardData, LineItem, DefectRecord } from '../types';
import { formatDateKorean, getTodayDateString, formatTimeShort } from '../utils/date';

interface DashboardScreenProps {
  dashboard: DashboardData;
  onSelectDate: (date: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  dashboard,
  onSelectDate,
  onRefresh,
  isRefreshing,
}) => {
  const today = getTodayDateString();
  const [autoRefreshCountdown, setAutoRefreshCountdown] = useState<number>(60);
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>('all');

  // 60-second auto-refresh countdown
  useEffect(() => {
    setAutoRefreshCountdown(60);
    const interval = setInterval(() => {
      setAutoRefreshCountdown((prev) => {
        if (prev <= 1) {
          onRefresh();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onRefresh, dashboard.workDate]);

  const handlePrevDay = () => {
    const current = new Date(dashboard.workDate);
    current.setDate(current.getDate() - 1);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    onSelectDate(`${year}-${month}-${day}`);
  };

  const handleNextDay = () => {
    const current = new Date(dashboard.workDate);
    current.setDate(current.getDate() + 1);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    onSelectDate(`${year}-${month}-${day}`);
  };

  const handleToday = () => {
    onSelectDate(today);
  };

  // Filtered line summaries if a specific line is tapped
  const displayedLines =
    selectedLineFilter === 'all'
      ? dashboard.lineSummaries
      : dashboard.lineSummaries.filter((l) => l.lineCode === selectedLineFilter);

  return (
    <div className="max-w-md mx-auto pb-24 pt-3 px-4">
      {/* Date Header & Auto-Refresh Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 mb-3.5 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          {/* Quick Date Navigation */}
          <div className="flex items-center gap-1.5 flex-1">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              title="이전 날짜"
            >
              ◀
            </button>
            <div className="relative flex-1">
              <input
                type="date"
                value={dashboard.workDate}
                onChange={(e) => onSelectDate(e.target.value)}
                className="w-full py-1 px-2 text-xs font-bold text-center bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              title="다음 날짜"
            >
              ▶
            </button>
            {dashboard.workDate !== today && (
              <button
                onClick={handleToday}
                className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-semibold"
              >
                오늘
              </button>
            )}
          </div>

          {/* Auto Refresh Info */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              {autoRefreshCountdown}s 후 자동갱신
            </span>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              title="지금 새로고침"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
            </button>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>작업일: {formatDateKorean(dashboard.workDate)}</span>
          <span className="font-mono tabular-nums text-slate-400">
            기준시각 {dashboard.lastUpdated ? dashboard.lastUpdated.split(' ')[1] : ''}
          </span>
        </div>
      </div>

      {/* 4 KPI METRIC CARDS */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {/* Metric 1: 누적 불량 건수 */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
            누적 불량 건수
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
              {dashboard.totalDefectCount.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-500">건</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            당일 정상 접수 기준
          </span>
        </div>

        {/* Metric 2: 총 불량 수량 */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
            총 불량 수량
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
              {dashboard.totalDefectQuantity.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-500">개</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            누적 불량품 합계
          </span>
        </div>

        {/* Metric 3: 전체 불량률 (%) */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
            전체 불량률
          </span>
          <div className="flex items-baseline gap-1">
            {dashboard.overallDefectRate !== null ? (
              <>
                <span
                  className={`text-2xl font-black font-mono tracking-tight tabular-nums ${
                    dashboard.overallDefectRate > 2.5
                      ? 'text-red-600 dark:text-red-400'
                      : dashboard.overallDefectRate > 1.0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {dashboard.overallDefectRate.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-slate-500">%</span>
              </>
            ) : (
              <span className="text-lg font-bold text-slate-400">
                집계 전
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block truncate">
            {dashboard.totalProductionQuantity !== null
              ? `총 생산: ${dashboard.totalProductionQuantity.toLocaleString()}개`
              : '생산 수량 마감 대기'}
          </span>
        </div>

        {/* Metric 4: 심각도 '상' 건수 */}
        <div
          className={`p-3.5 rounded-2xl border shadow-xs transition-colors ${
            dashboard.highSeverityCount > 0
              ? 'bg-red-50/80 dark:bg-red-950/40 border-red-200 dark:border-red-900/60'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <span className="text-[11px] font-semibold text-red-700 dark:text-red-400 block mb-1">
            심각도 [상] 건수
          </span>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-2xl font-black font-mono tracking-tight tabular-nums ${
                dashboard.highSeverityCount > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {dashboard.highSeverityCount}
            </span>
            <span className="text-xs font-bold text-slate-500">건</span>
          </div>
          <span className="text-[10px] text-red-600/80 dark:text-red-400/80 mt-1 block font-medium">
            {dashboard.highSeverityCount > 0
              ? '긴급 점검 및 조치 요망'
              : '정상 운전 상태'}
          </span>
        </div>
      </div>

      {/* SECTION: 심각도 '상' 불량 내역 (Critical Defects List) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 mb-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              심각도 '상' 불량 내역
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded-full">
            {dashboard.highSeverityList.length}건 발생
          </span>
        </div>

        {dashboard.highSeverityList.length === 0 ? (
          <div className="text-center py-6 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-1.5 opacity-80" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              당일 심각도 '상' 불량이 없습니다
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              중대한 라인 이상 없이 원활하게 생산 중입니다.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {dashboard.highSeverityList.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 relative"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {item.lineName}
                    </span>
                    <span className="text-red-700 dark:text-red-300 font-extrabold bg-red-100 dark:bg-red-900/50 px-1.5 py-0.2 rounded text-[10px]">
                      상 (심각)
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    {formatTimeShort(item.timestamp)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    유형: {item.defectType}
                  </span>
                  <span className="font-bold font-mono text-red-600 dark:text-red-400 text-sm tabular-nums">
                    {item.quantity}개
                  </span>
                </div>

                {item.remarks && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 p-2 rounded-lg mt-1.5 border border-red-100 dark:border-red-950">
                    비고: {item.remarks}
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pt-1 border-t border-red-200/50 dark:border-red-900/40">
                  <span>기록ID: {item.id}</span>
                  <span>입력자: {item.reporterName || '미입력'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION: 라인별 현황 (Line-by-Line Breakdown) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              라인별 불량률 종합 현황
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">총 5개 라인</span>
        </div>

        {/* Line Filter Segments */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2.5 text-xs">
          <button
            onClick={() => setSelectedLineFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedLineFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            전체 라인
          </button>
          {dashboard.lineSummaries.map((l) => (
            <button
              key={l.lineCode}
              onClick={() => setSelectedLineFilter(l.lineCode)}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedLineFilter === l.lineCode
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {l.lineName.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Lines Cards */}
        <div className="space-y-3">
          {displayedLines.map((line) => {
            const hasProduction = line.productionQuantity !== null;
            const isCriticalRate = line.defectRate !== null && line.defectRate > 2.5;
            const isWarningRate = line.defectRate !== null && line.defectRate > 1.0 && line.defectRate <= 2.5;

            return (
              <div
                key={line.lineCode}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                {/* Line Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {line.lineName}
                    </span>
                    {line.highSeverityCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 text-[10px] font-bold">
                        상 {line.highSeverityCount}건
                      </span>
                    )}
                  </div>

                  {/* Defect Rate Badge */}
                  <div className="text-right">
                    {hasProduction ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-[11px] text-slate-400">불량률</span>
                        <span
                          className={`text-base font-extrabold font-mono tabular-nums ${
                            isCriticalRate
                              ? 'text-red-600 dark:text-red-400'
                              : isWarningRate
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {line.defectRate!.toFixed(2)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        집계 전
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar visual for defect rate */}
                {hasProduction && (
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-2.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCriticalRate
                          ? 'bg-red-500'
                          : isWarningRate
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(2, (line.defectRate || 0) * 15))}%`,
                      }}
                    />
                  </div>
                )}

                {/* Metric Grid for this line */}
                <div className="grid grid-cols-3 gap-2 py-2 px-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">생산 수량</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                      {hasProduction ? `${line.productionQuantity!.toLocaleString()}개` : '미입력'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">불량 건수</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                      {line.defectCount}건
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">불량 수량</span>
                    <span className="font-bold font-mono text-red-600 dark:text-red-400 tabular-nums">
                      {line.defectQuantity.toLocaleString()}개
                    </span>
                  </div>
                </div>

                {/* Defect Type Breakdown */}
                {Object.keys(line.typeDistribution).length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                      유형별 분포:
                    </span>
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      {Object.entries(line.typeDistribution).map(([type, count]) => (
                        <span
                          key={type}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                        >
                          {type} <strong className="font-mono text-slate-900 dark:text-white">{count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
