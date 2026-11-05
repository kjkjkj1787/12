import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Plus, Minus, Send, RotateCcw, Sparkles } from 'lucide-react';
import { LineItem, SeverityLevel } from '../types';
import { COMMON_DEFECT_TYPES } from '../utils/defaults';
import { store } from '../utils/storage';
import { getTodayDateString } from '../utils/date';

interface DefectInputScreenProps {
  lines: LineItem[];
  onDefectAdded: () => void;
}

export const DefectInputScreen: React.FC<DefectInputScreenProps> = ({
  lines,
  onDefectAdded,
}) => {
  // Retain selected line across saves for fast continuous entry
  const [selectedLineCode, setSelectedLineCode] = useState<string>(() => {
    return lines[0]?.lineCode || 'LINE-01';
  });

  const [selectedType, setSelectedType] = useState<string>('외관 스크래치');
  const [customType, setCustomType] = useState<string>('');
  const [isCustomTypeMode, setIsCustomTypeMode] = useState<boolean>(false);

  const [quantity, setQuantity] = useState<number>(1);
  const [severity, setSeverity] = useState<SeverityLevel>('중');
  const [remarks, setRemarks] = useState<string>('');
  const [reporterName, setReporterName] = useState<string>(() => {
    return localStorage.getItem('last_reporter_name') || '';
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync selected line if lines list updates
  useEffect(() => {
    if (lines.length > 0 && !lines.some((l) => l.lineCode === selectedLineCode)) {
      setSelectedLineCode(lines[0].lineCode);
    }
  }, [lines, selectedLineCode]);

  // Haptic feedback for tactile glove response
  const triggerHaptic = (ms: number = 30) => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(ms);
      }
    } catch {
      // Ignore if not supported
    }
  };

  const handleLineSelect = (code: string) => {
    triggerHaptic(25);
    setSelectedLineCode(code);
  };

  const handleTypeSelect = (type: string) => {
    triggerHaptic(25);
    if (type === '기타') {
      setIsCustomTypeMode(true);
      setSelectedType('기타');
    } else {
      setIsCustomTypeMode(false);
      setSelectedType(type);
    }
  };

  const handleSeveritySelect = (level: SeverityLevel) => {
    triggerHaptic(30);
    setSeverity(level);
  };

  const handleQuickQuantity = (delta: number) => {
    triggerHaptic(20);
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleQuickTagClick = (tag: string) => {
    triggerHaptic(20);
    setRemarks((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return tag;
      if (trimmed.includes(tag)) return trimmed;
      return `${trimmed}, ${tag}`;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic(50);

    // Validation
    if (!selectedLineCode) {
      setFeedback({ type: 'error', message: '작업 라인을 선택해주세요.' });
      return;
    }

    const defectTypeToSave = isCustomTypeMode ? customType.trim() : selectedType;
    if (!defectTypeToSave) {
      setFeedback({ type: 'error', message: '불량 유형을 선택하거나 직접 입력해주세요.' });
      return;
    }

    if (!quantity || quantity < 1) {
      setFeedback({ type: 'error', message: '불량 수량은 1 이상의 정수여야 합니다.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const selectedLine = lines.find((l) => l.lineCode === selectedLineCode);
      const lineName = selectedLine ? selectedLine.lineName : selectedLineCode;

      store.addDefect({
        lineCode: selectedLineCode,
        lineName,
        defectType: defectTypeToSave,
        quantity,
        severity,
        remarks,
        reporterName,
      });

      // Remember reporter name
      if (reporterName.trim()) {
        localStorage.setItem('last_reporter_name', reporterName.trim());
      }

      // Success feedback
      setFeedback({
        type: 'success',
        message: `${lineName}에 불량 ${quantity}건이 신속 등록되었습니다!`,
      });

      // Clear input fields but KEEP selected line and reporter name as per PRD requirement
      setQuantity(1);
      setSeverity('중');
      setRemarks('');
      if (isCustomTypeMode) {
        setCustomType('');
        setIsCustomTypeMode(false);
        setSelectedType('외관 스크래치');
      }

      onDefectAdded();

      // Auto-hide success message after 4s
      setTimeout(() => {
        setFeedback((prev) => (prev?.type === 'success' ? null : prev));
      }, 4000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || '저장 중 오류가 발생했습니다. 다시 시도해주세요.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeLines = lines.filter((l) => l.isActive);

  return (
    <div className="max-w-md mx-auto pb-24 pt-3 px-4">
      {/* Top Banner / Goal Info */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            불량 등록
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            현장 발생 즉시 터치하여 30초 내 입력
          </p>
        </div>
        <span className="text-xs font-mono font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
          {getTodayDateString()}
        </span>
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* SECTION 1: 라인 선택 (Line Selection) - Big tactile buttons */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2 px-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              1. 발생 라인 선택 <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">연속 입력 유지됨</span>
          </div>

          <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
            {activeLines.map((line) => {
              const isSelected = selectedLineCode === line.lineCode;
              return (
                <button
                  key={line.lineCode}
                  type="button"
                  onClick={() => handleLineSelect(line.lineCode)}
                  className={`min-h-[52px] p-2 rounded-xl text-left font-medium transition-all active:scale-[0.98] border flex flex-col justify-center ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/40'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                    {line.lineName.split(' ')[0]}
                  </span>
                  <span className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    {line.lineName.split(' ').slice(1).join(' ') || line.department || ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: 불량 유형 (Defect Type) - Button Grid */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2 px-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              2. 불량 유형 선택 <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">자주 발생하는 유형</span>
          </div>

          <div className="grid grid-cols-2 xs:grid-cols-3 gap-2 mb-2.5">
            {COMMON_DEFECT_TYPES.map((type) => {
              const isSelected = !isCustomTypeMode && selectedType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeSelect(type)}
                  className={`min-h-[46px] px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] border text-center flex items-center justify-center ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm ring-1 ring-slate-400'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>

          {isCustomTypeMode && (
            <div className="mt-2 animate-fade-in">
              <input
                type="text"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="직접 불량 유형을 입력하세요"
                className="w-full px-3.5 py-2.5 rounded-xl border border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* SECTION 3: 불량 수량 (Quantity Stepper) */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 px-1">
            3. 불량 수량 (개) <span className="text-red-500">*</span>
          </label>

          <div className="flex items-center gap-2 mb-2.5">
            <button
              type="button"
              onClick={() => handleQuickQuantity(-1)}
              disabled={quantity <= 1}
              className="w-14 h-14 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center active:scale-95 disabled:opacity-30 transition-all"
              aria-label="1개 감소"
            >
              <Minus className="w-6 h-6" />
            </button>

            <div className="flex-1 h-14 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setQuantity(isNaN(val) ? 1 : Math.max(1, val));
                }}
                className="w-full text-center text-2xl font-bold font-mono text-slate-900 dark:text-white bg-transparent focus:outline-none tabular-nums"
              />
            </div>

            <button
              type="button"
              onClick={() => handleQuickQuantity(1)}
              className="w-14 h-14 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center active:scale-95 transition-all border border-blue-200 dark:border-blue-800"
              aria-label="1개 증가"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* Quick Increment Buttons for Fast Entry */}
          <div className="grid grid-cols-4 gap-2">
            {[1, 5, 10, 20].map((add) => (
              <button
                key={add}
                type="button"
                onClick={() => handleQuickQuantity(add)}
                className="py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold active:scale-95 transition-all"
              >
                +{add}
              </button>
            ))}
          </div>
        </div>

        {/* SECTION 4: 심각도 (Severity) - 3 Large Buttons */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2 px-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              4. 심각도 선택 <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">
              '상' 선택 시 관리자 우선 확인
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* 상 (Critical) */}
            <button
              type="button"
              onClick={() => handleSeveritySelect('상')}
              className={`min-h-[54px] p-2 rounded-xl text-center font-bold text-xs flex flex-col items-center justify-center transition-all active:scale-[0.98] border ${
                severity === '상'
                  ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-400/40'
                  : 'bg-red-50 hover:bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/50'
              }`}
            >
              <span className="text-sm font-extrabold">상 (심각)</span>
              <span className={`text-[10px] ${severity === '상' ? 'text-red-100' : 'text-red-600 dark:text-red-400'}`}>
                라인 정지/점검급
              </span>
            </button>

            {/* 중 (Moderate) */}
            <button
              type="button"
              onClick={() => handleSeveritySelect('중')}
              className={`min-h-[54px] p-2 rounded-xl text-center font-bold text-xs flex flex-col items-center justify-center transition-all active:scale-[0.98] border ${
                severity === '중'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-400/40'
                  : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50'
              }`}
            >
              <span className="text-sm font-extrabold">중 (보통)</span>
              <span className={`text-[10px] ${severity === '중' ? 'text-amber-100' : 'text-amber-600 dark:text-amber-400'}`}>
                일반 가공 불량
              </span>
            </button>

            {/* 하 (Minor) */}
            <button
              type="button"
              onClick={() => handleSeveritySelect('하')}
              className={`min-h-[54px] p-2 rounded-xl text-center font-bold text-xs flex flex-col items-center justify-center transition-all active:scale-[0.98] border ${
                severity === '하'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400/40'
                  : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50'
              }`}
            >
              <span className="text-sm font-extrabold">하 (경미)</span>
              <span className={`text-[10px] ${severity === '하' ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                재작업/경미 수정
              </span>
            </button>
          </div>
        </div>

        {/* SECTION 5: 비고 & 입력자 이름 (Optional) */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 px-1">
              5. 비고 및 특이사항 <span className="text-slate-400 font-normal">(선택)</span>
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="예: 척 압력 저하, 노즐 이물질 세척 요망 등"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Quick Note Tags */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['조치 완료', '설비 점검 요망', '자재 교체 요망', '원인 조사 중', '재작업 완료'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleQuickTagClick(tag)}
                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-medium active:scale-95 transition-all"
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 px-1">
              입력자 이름 <span className="text-slate-400 font-normal">(선택, 저장 유지)</span>
            </label>
            <input
              type="text"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="예: 김작업, 이반장"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* SECTION 6: Big Tactile Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-base shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                저장 중...
              </span>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>불량 기록 저장하기</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
