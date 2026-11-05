import React, { useState } from 'react';
import {
  ShieldCheck,
  Download,
  Filter,
  Search,
  Edit2,
  Trash2,
  History,
  Lock,
  Layers,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { DefectRecord, LineItem, AuditLog, SeverityLevel, RecordStatus } from '../types';
import { store } from '../utils/storage';
import { calculateDashboardData } from '../utils/calculator';
import { generateDailyReportCSV } from '../utils/exportExcel';
import { formatDateKorean, getTodayDateString, formatTimeShort } from '../utils/date';
import { COMMON_DEFECT_TYPES } from '../utils/defaults';

interface AdminScreenProps {
  lines: LineItem[];
  verifiedPin: string | null;
  onRequestPin: () => void;
  onDataChanged: () => void;
  onOpenGasModal: () => void;
}

export const AdminScreen: React.FC<AdminScreenProps> = ({
  lines,
  verifiedPin,
  onRequestPin,
  onDataChanged,
  onOpenGasModal,
}) => {
  const today = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'records' | 'audit' | 'settings'>('records');

  // Edit / Cancel Modal State
  const [targetRecord, setTargetRecord] = useState<DefectRecord | null>(null);
  const [actionType, setActionType] = useState<'edit' | 'cancel' | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editDefectType, setEditDefectType] = useState<string>('');
  const [editSeverity, setEditSeverity] = useState<SeverityLevel>('중');
  const [editRemarks, setEditRemarks] = useState<string>('');
  const [actionReason, setActionReason] = useState<string>('');
  const [modifierName, setModifierName] = useState<string>('관리자');
  const [modalError, setModalError] = useState<string>('');

  // PIN change state
  const [currentPinInput, setCurrentPinInput] = useState<string>('');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [pinChangeMessage, setPinChangeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // If not verified yet, show PIN unlock banner
  if (!verifiedPin) {
    return (
      <div className="max-w-md mx-auto pb-24 pt-8 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          관리자 PIN 인증이 필요합니다
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-6 leading-relaxed">
          내역 수정 및 취소, 엑셀 일간 리포트 다운로드, 시스템 설정은 관리자 권한으로 보호됩니다.
        </p>

        <button
          onClick={onRequestPin}
          className="w-full max-w-xs mx-auto h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>관리자 PIN 입력하기</span>
        </button>

        <p className="text-[11px] text-slate-400 mt-4">
          기본 PIN 번호는 <strong className="text-slate-600 dark:text-slate-300">1234</strong> 입니다.
        </p>
      </div>
    );
  }

  // Load records
  const allDefects = store.getDefects();
  const dateDefects = allDefects.filter((d) => d.workDate === selectedDate);
  const auditLogs = store.getAuditLogs();

  // Filtered defects
  const filteredDefects = dateDefects.filter((d) => {
    if (selectedLineFilter !== 'all' && d.lineCode !== selectedLineFilter) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        d.defectType.toLowerCase().includes(q) ||
        d.lineName.toLowerCase().includes(q) ||
        (d.remarks && d.remarks.toLowerCase().includes(q)) ||
        (d.reporterName && d.reporterName.toLowerCase().includes(q)) ||
        d.id.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Export Daily Report CSV
  const handleExportDailyReport = () => {
    const productions = store.getProductions();
    const dashboard = calculateDashboardData(selectedDate, lines, allDefects, productions);
    generateDailyReportCSV(dashboard, dateDefects);
  };

  // Open Edit Modal
  const openEditModal = (record: DefectRecord) => {
    setTargetRecord(record);
    setActionType('edit');
    setEditQuantity(record.quantity);
    setEditDefectType(record.defectType);
    setEditSeverity(record.severity);
    setEditRemarks(record.remarks);
    setActionReason('');
    setModalError('');
  };

  // Open Cancel Modal
  const openCancelModal = (record: DefectRecord) => {
    setTargetRecord(record);
    setActionType('cancel');
    setActionReason('');
    setModalError('');
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRecord || !actionType) return;

    if (!actionReason.trim()) {
      setModalError('수정/취소 사유를 반드시 입력해주세요 (수정이력 기록용).');
      return;
    }

    try {
      if (actionType === 'cancel') {
        store.updateDefect(
          verifiedPin,
          targetRecord.id,
          { status: '취소' },
          actionReason.trim(),
          modifierName.trim()
        );
      } else {
        if (!editQuantity || editQuantity < 1) {
          setModalError('수량은 1 이상의 정수여야 합니다.');
          return;
        }

        store.updateDefect(
          verifiedPin,
          targetRecord.id,
          {
            quantity: editQuantity,
            defectType: editDefectType,
            severity: editSeverity,
            remarks: editRemarks,
          },
          actionReason.trim(),
          modifierName.trim()
        );
      }

      setTargetRecord(null);
      setActionType(null);
      onDataChanged();
    } catch (err: any) {
      setModalError(err?.message || '처리 중 오류가 발생했습니다.');
    }
  };

  const handlePinChange = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      store.changeAdminPin(currentPinInput, newPinInput);
      setPinChangeMessage({ type: 'success', text: '관리자 PIN이 성공적으로 변경되었습니다.' });
      setCurrentPinInput('');
      setNewPinInput('');
    } catch (err: any) {
      setPinChangeMessage({ type: 'error', text: err?.message || 'PIN 변경 실패' });
    }
  };

  const handleResetData = () => {
    if (confirm('샘플 데이터로 초기화하시겠습니까? 등록된 모든 임의 기록이 재설정됩니다.')) {
      store.resetToSample();
      onDataChanged();
      alert('샘플 데이터로 초기화되었습니다.');
    }
  };

  return (
    <div className="max-w-md mx-auto pb-24 pt-3 px-4">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              관리자 모드
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              PIN 인증 완료됨 (보안 접근 중)
            </p>
          </div>
        </div>

        <button
          onClick={handleExportDailyReport}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
          title="일간 리포트 엑셀 CSV 다운로드"
        >
          <Download className="w-4 h-4" />
          <span>엑셀 리포트</span>
        </button>
      </div>

      {/* Sub Tabs: 기록 관리 | 수정이력 | 시스템 설정 */}
      <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-3.5">
        <button
          onClick={() => setActiveAdminSubTab('records')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            activeAdminSubTab === 'records'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          불량 기록 ({filteredDefects.length})
        </button>
        <button
          onClick={() => setActiveAdminSubTab('audit')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            activeAdminSubTab === 'audit'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          수정이력 ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveAdminSubTab('settings')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            activeAdminSubTab === 'settings'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          설정 및 시트
        </button>
      </div>

      {/* TAB 1: 불량 기록 관리 */}
      {activeAdminSubTab === 'records' && (
        <div className="space-y-3">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-0.5">조회 날짜</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-0.5">라인 필터</label>
                <select
                  value={selectedLineFilter}
                  onChange={(e) => setSelectedLineFilter(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="all">전체 라인</option>
                  {lines.map((l) => (
                    <option key={l.lineCode} value={l.lineCode}>
                      {l.lineName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="유형, 비고, 입력자 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="all">전체 상태</option>
                <option value="정상">정상</option>
                <option value="취소">취소됨</option>
              </select>
            </div>
          </div>

          {/* List of Defects */}
          {filteredDefects.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-slate-400 text-xs">
              선택한 조건의 불량 기록이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDefects.map((d) => {
                const isCancelled = d.status === '취소';
                return (
                  <div
                    key={d.id}
                    className={`p-3 rounded-2xl border transition-all ${
                      isCancelled
                        ? 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {d.lineName.split(' ')[0]}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                            d.severity === '상'
                              ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'
                              : d.severity === '중'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {d.severity}
                        </span>
                        {isCancelled && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            취소됨
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                        {formatTimeShort(d.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {d.defectType}
                      </span>
                      <span className="font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                        {d.quantity}개
                      </span>
                    </div>

                    {d.remarks && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg mb-2">
                        {d.remarks}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                      <span>입력자: {d.reporterName || '미입력'}</span>

                      {!isCancelled && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEditModal(d)}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            수정
                          </button>
                          <button
                            onClick={() => openCancelModal(d)}
                            className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 font-semibold flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            취소
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: 수정이력 (Audit Logs) */}
      {activeAdminSubTab === 'audit' && (
        <div className="space-y-2">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs mb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                변경 추적 수정이력 (시트: 수정이력)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              관리자 PIN으로 수정 또는 취소된 모든 내역의 전·후 값과 사유가 보존됩니다.
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-slate-400 text-xs">
              아직 등록된 수정/취소 이력이 없습니다.
            </div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        log.action === '취소'
                          ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="font-mono text-slate-500 text-[11px]">
                      {log.targetId}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 tabular-nums">
                    {log.timestamp}
                  </span>
                </div>

                <div className="text-slate-700 dark:text-slate-300">
                  <strong>수정자:</strong> {log.modifierName} | <strong>사유:</strong> {log.reason}
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded text-[10px] font-mono text-slate-600 dark:text-slate-400 space-y-0.5">
                  <div>
                    <span className="text-red-500 font-bold">이전:</span>{' '}
                    {JSON.stringify(log.before)}
                  </div>
                  <div>
                    <span className="text-emerald-500 font-bold">변경:</span>{' '}
                    {JSON.stringify(log.after)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: 설정 및 시트 연동 */}
      {activeAdminSubTab === 'settings' && (
        <div className="space-y-4">
          {/* PIN Change Form */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-500" />
              관리자 PIN 변경
            </h3>

            {pinChangeMessage && (
              <div
                className={`mb-3 p-2 rounded-lg text-xs font-medium ${
                  pinChangeMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300'
                }`}
              >
                {pinChangeMessage.text}
              </div>
            )}

            <form onSubmit={handlePinChange} className="space-y-2">
              <input
                type="password"
                placeholder="현재 PIN (기본: 1234)"
                value={currentPinInput}
                onChange={(e) => setCurrentPinInput(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
              <input
                type="password"
                placeholder="새 PIN (4자리 이상)"
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all"
              >
                PIN 저장하기
              </button>
            </form>
          </div>

          {/* Google Apps Script & Sheets Guide */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                Google Apps Script 연동 코드
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
              기획서 사양에 맞춰 구현된 Code.gs, Service.gs, Repository.gs, Auth.gs 전체 소스코드를 확인하고 구글 시트에 바로 배포할 수 있습니다.
            </p>
            <button
              onClick={onOpenGasModal}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Apps Script 코드 및 배포 가이드 보기
            </button>
          </div>

          {/* Reset Demo Data */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 text-red-600 dark:text-red-400 flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              초기 샘플 데이터 복원
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              테스트 중 입력한 데이터를 비우고 기획서 검증용 5개 라인 기본 샘플 데이터로 복원합니다.
            </p>
            <button
              onClick={handleResetData}
              className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold transition-all"
            >
              샘플 데이터로 초기화
            </button>
          </div>
        </div>
      )}

      {/* EDIT / CANCEL MODAL */}
      {targetRecord && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {actionType === 'cancel' ? '불량 기록 취소 (이력 보존)' : '불량 기록 내용 수정'}
              </h3>
              <button
                onClick={() => {
                  setTargetRecord(null);
                  setActionType(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 mb-3 text-xs space-y-1">
              <div><strong>대상 기록:</strong> {targetRecord.id}</div>
              <div><strong>라인:</strong> {targetRecord.lineName} | <strong>일시:</strong> {targetRecord.timestamp}</div>
            </div>

            {modalError && (
              <div className="mb-3 p-2 rounded-lg bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-xs font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-3">
              {actionType === 'edit' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      불량 유형
                    </label>
                    <select
                      value={editDefectType}
                      onChange={(e) => setEditDefectType(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {COMMON_DEFECT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        수량 (개)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(parseInt(e.target.value, 10) || 1)}
                        className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        심각도
                      </label>
                      <select
                        value={editSeverity}
                        onChange={(e) => setEditSeverity(e.target.value as SeverityLevel)}
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="상">상 (심각)</option>
                        <option value="중">중 (보통)</option>
                        <option value="하">하 (경미)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      비고
                    </label>
                    <input
                      type="text"
                      value={editRemarks}
                      onChange={(e) => setEditRemarks(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </>
              )}

              {actionType === 'cancel' && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  해당 건을 '취소' 상태로 변경하며 집계에서 제외합니다. 삭제되지 않고 수정이력에 기록됩니다.
                </p>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  수정/취소 사유 <span className="text-red-500">* (필수)</span>
                </label>
                <input
                  type="text"
                  placeholder="예: 수량 오입력, 중복 접수 취소, 오판정 등"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  수정자 이름
                </label>
                <input
                  type="text"
                  value={modifierName}
                  onChange={(e) => setModifierName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTargetRecord(null);
                    setActionType(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  닫기
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm ${
                    actionType === 'cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {actionType === 'cancel' ? '취소 처리하기' : '수정 저장하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
