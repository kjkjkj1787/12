import React, { useState, useEffect } from 'react';
import { Package, CheckCircle2, AlertCircle, Save, Clock, HelpCircle } from 'lucide-react';
import { LineItem, ProductionRecord } from '../types';
import { store } from '../utils/storage';
import { getTodayDateString, formatDateKorean, formatTimeShort } from '../utils/date';

interface ProductionInputScreenProps {
  lines: LineItem[];
  onProductionSaved: () => void;
}

export const ProductionInputScreen: React.FC<ProductionInputScreenProps> = ({
  lines,
  onProductionSaved,
}) => {
  const [workDate, setWorkDate] = useState<string>(getTodayDateString());
  const [selectedLineCode, setSelectedLineCode] = useState<string>(() => lines[0]?.lineCode || 'LINE-01');
  const [productionQty, setProductionQty] = useState<string>('');
  const [reporterName, setReporterName] = useState<string>(() => {
    return localStorage.getItem('last_reporter_name') || '';
  });

  const [existingRecord, setExistingRecord] = useState<ProductionRecord | null>(null);
  const [showOverwriteModal, setShowOverwriteModal] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load existing productions for the chosen date
  const [dateProductions, setDateProductions] = useState<ProductionRecord[]>([]);

  const reloadDateProductions = () => {
    const list = store.getProductions(workDate);
    setDateProductions(list);

    // Check if the currently selected line already has a record
    const match = list.find((p) => p.lineCode === selectedLineCode);
    setExistingRecord(match || null);
    if (match) {
      setProductionQty(String(match.productionQuantity));
    } else {
      setProductionQty('');
    }
  };

  useEffect(() => {
    reloadDateProductions();
  }, [workDate, selectedLineCode]);

  const handleLineSelect = (code: string) => {
    setSelectedLineCode(code);
    const match = dateProductions.find((p) => p.lineCode === code);
    setExistingRecord(match || null);
    if (match) {
      setProductionQty(String(match.productionQuantity));
    } else {
      setProductionQty('');
    }
    setFeedback(null);
  };

  const executeSave = () => {
    const qtyNum = parseInt(productionQty, 10);
    const selectedLine = lines.find((l) => l.lineCode === selectedLineCode);
    const lineName = selectedLine ? selectedLine.lineName : selectedLineCode;

    setIsSubmitting(true);
    setFeedback(null);
    setShowOverwriteModal(false);

    try {
      store.upsertProduction({
        workDate,
        lineCode: selectedLineCode,
        lineName,
        productionQuantity: qtyNum,
        reporterName,
      });

      if (reporterName.trim()) {
        localStorage.setItem('last_reporter_name', reporterName.trim());
      }

      setFeedback({
        type: 'success',
        message: `${lineName} 생산 실적(${qtyNum.toLocaleString()}개)이 정상 등록되었습니다!`,
      });

      reloadDateProductions();
      onProductionSaved();

      setTimeout(() => {
        setFeedback((prev) => (prev?.type === 'success' ? null : prev));
      }, 4000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || '생산 실적 저장 중 오류가 발생했습니다.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLineCode) {
      setFeedback({ type: 'error', message: '라인을 선택해주세요.' });
      return;
    }

    const qtyNum = parseInt(productionQty, 10);
    if (isNaN(qtyNum) || qtyNum < 0) {
      setFeedback({ type: 'error', message: '생산 수량을 0 이상의 정수로 입력해주세요.' });
      return;
    }

    // F03: If record already exists for this date + line, ask for overwrite confirmation
    if (existingRecord && existingRecord.productionQuantity !== qtyNum) {
      setShowOverwriteModal(true);
      return;
    }

    executeSave();
  };

  const activeLines = lines.filter((l) => l.isActive);

  return (
    <div className="max-w-md mx-auto pb-24 pt-3 px-4">
      {/* Top Banner */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            생산 실적 마감
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            작업 종료 후 라인별 총 투입 생산 수량 등록
          </p>
        </div>
        <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`mb-4 p-3.5 rounded-xl flex items-center gap-2.5 text-sm font-medium shadow-sm transition-all animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span className="flex-1">{feedback.message}</span>
        </div>
      )}

      {/* SECTION 1: 라인별 입력 현황 요약 (Completion Status Cards) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 mb-4 shadow-xs">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            당일 라인별 마감 현황 ({formatDateKorean(workDate)})
          </span>
          <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-semibold">
            {dateProductions.length} / {activeLines.length} 완료
          </span>
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          {activeLines.map((line) => {
            const prod = dateProductions.find((p) => p.lineCode === line.lineCode);
            const isSelected = selectedLineCode === line.lineCode;

            return (
              <button
                key={line.lineCode}
                type="button"
                onClick={() => handleLineSelect(line.lineCode)}
                className={`w-full p-2.5 rounded-xl text-left border flex items-center justify-between transition-all active:scale-[0.99] ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      prod ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {line.lineName}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {prod ? `입력완료 (${formatTimeShort(prod.updatedAt)})` : '미입력 (터치하여 입력)'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  {prod ? (
                    <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {prod.productionQuantity.toLocaleString()}개
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-400 px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700/60">
                      대기 중
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: 입력 폼 (Input Form) */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          {/* Work Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 px-1">
              작업일자 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Line Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 px-1">
              대상 라인 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
              {activeLines.map((line) => {
                const isSelected = selectedLineCode === line.lineCode;
                return (
                  <button
                    key={line.lineCode}
                    type="button"
                    onClick={() => handleLineSelect(line.lineCode)}
                    className={`p-2 rounded-xl text-center font-bold text-xs transition-all border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {line.lineName.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Production Quantity Input */}
          <div>
            <div className="flex items-center justify-between mb-1 px-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                총 생산 수량 (개) <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">
                불량품을 포함한 총 투입 수량
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                min="0"
                step="1"
                placeholder="예: 1200"
                value={productionQty}
                onChange={(e) => setProductionQty(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xl font-bold font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
                required
              />
              <span className="absolute right-4 top-3.5 text-sm font-bold text-slate-400">
                개
              </span>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              {[500, 800, 1000, 1200].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setProductionQty(String(preset))}
                  className="py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  {preset.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Reporter Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 px-1">
              라인 담당자 / 입력자 <span className="text-slate-400 font-normal">(선택)</span>
            </label>
            <input
              type="text"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="예: 홍길동 반장"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-base shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          <span>{existingRecord ? '생산 실적 덮어쓰기 저장' : '생산 실적 마감 저장'}</span>
        </button>
      </form>

      {/* OVERWRITE CONFIRMATION MODAL (F03) */}
      {showOverwriteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              기존 생산 실적 덮어쓰기 확인
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              <strong>{workDate}</strong>의 <strong>{existingRecord?.lineName}</strong>에 이미 등록된 실적(
              <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                {existingRecord?.productionQuantity.toLocaleString()}개
              </span>
              )이 존재합니다.
              <br />
              새로운 수량(
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {parseInt(productionQty, 10).toLocaleString()}개
              </span>
              )으로 덮어쓰시겠습니까?
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowOverwriteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                취소
              </button>
              <button
                type="button"
                onClick={executeSave}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-sm"
              >
                덮어쓰기 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
