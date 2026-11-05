import React, { useState } from 'react';
import { X, Copy, Check, FileCode, ExternalLink, Sheet } from 'lucide-react';
import { GAS_SCRIPTS } from '../utils/gasTemplates';

interface GasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GasModal: React.FC<GasModalProps> = ({ isOpen, onClose }) => {
  const fileKeys = Object.keys(GAS_SCRIPTS) as (keyof typeof GAS_SCRIPTS)[];
  const [selectedFile, setSelectedFile] = useState<keyof typeof GAS_SCRIPTS>('Code.gs');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (key: keyof typeof GAS_SCRIPTS) => {
    navigator.clipboard.writeText(GAS_SCRIPTS[key]);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                구글 시트 & Google Apps Script 소스코드
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                기획서 기반 4개 시트 자동 구성 및 웹앱 배포 가이드
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Deployment Steps Summary */}
        <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30 text-xs text-slate-700 dark:text-slate-300">
          <strong className="text-blue-700 dark:text-blue-400 block mb-1">
            빠른 구글 시트 배포 4단계:
          </strong>
          <ol className="list-decimal pl-4 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-400">
            <li>Google 스프레드시트 생성 후 <strong>확장 프로그램 &gt; Apps Script</strong> 클릭</li>
            <li>아래 탭의 파일들을 Apps Script 프로젝트에 각각 생성 및 코드 붙여넣기</li>
            <li><strong>배포 &gt; 새 배포 &gt; 웹 앱</strong> 선택 (실행: 나, 액세스: 모든 사용자)</li>
            <li>발급된 <strong>/exec</strong> URL을 현장 작업자들에게 공유 및 안드로이드 Chrome 홈 화면에 추가</li>
          </ol>
        </div>

        {/* File Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 pt-2 gap-1 overflow-x-auto bg-slate-50/80 dark:bg-slate-900">
          {fileKeys.map((key) => (
            <button
              key={key}
              onClick={() => setSelectedFile(key)}
              className={`px-3 py-2 text-xs font-mono font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedFile === key
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{key}</span>
            </button>
          ))}
        </div>

        {/* Code Content View */}
        <div className="relative flex-1 p-4 overflow-y-auto bg-slate-950 font-mono text-xs text-slate-200 max-h-96">
          <button
            onClick={() => handleCopy(selectedFile)}
            className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-sans text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            {copiedKey === selectedFile ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>복사 완료!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{selectedFile} 복사</span>
              </>
            )}
          </button>

          <pre className="whitespace-pre-wrap leading-relaxed pr-24">
            {GAS_SCRIPTS[selectedFile]}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <span className="text-[11px] text-slate-500">
            현재 웹앱에서도 전체 기능이 실시간으로 동작합니다.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
