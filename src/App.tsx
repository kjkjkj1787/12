/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { DefectInputScreen } from './components/DefectInputScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { ProductionInputScreen } from './components/ProductionInputScreen';
import { AdminScreen } from './components/AdminScreen';
import { PinModal } from './components/PinModal';
import { GasModal } from './components/GasModal';
import { store } from './utils/storage';
import { calculateDashboardData } from './utils/calculator';
import { getTodayDateString } from './utils/date';
import { LineItem, DashboardData } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('defect');
  const [lines, setLines] = useState<LineItem[]>([]);
  const [selectedDashboardDate, setSelectedDashboardDate] = useState<string>(getTodayDateString());
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Admin PIN verification state
  const [verifiedPin, setVerifiedPin] = useState<string | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pendingTabAfterPin, setPendingTabAfterPin] = useState<TabType | null>(null);

  // GAS modal state
  const [isGasModalOpen, setIsGasModalOpen] = useState<boolean>(false);

  // Refresh data from storage
  const refreshData = useCallback(() => {
    setIsRefreshing(true);
    const loadedLines = store.getLines();
    const allDefects = store.getDefects();
    const allProductions = store.getProductions();

    setLines(loadedLines);
    const calculated = calculateDashboardData(
      selectedDashboardDate,
      loadedLines,
      allDefects,
      allProductions
    );
    setDashboardData(calculated);

    setTimeout(() => {
      setIsRefreshing(false);
    }, 200);
  }, [selectedDashboardDate]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Tab change handler
  const handleTabChange = (tab: TabType) => {
    if (tab === 'admin' && !verifiedPin) {
      setPendingTabAfterPin('admin');
      setIsPinModalOpen(true);
      return;
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePinSuccess = (pin: string) => {
    setVerifiedPin(pin);
    setIsPinModalOpen(false);
    if (pendingTabAfterPin) {
      setActiveTab(pendingTabAfterPin);
      setPendingTabAfterPin(null);
    }
  };

  const highSeverityCount = dashboardData?.highSeverityCount || 0;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* Top App Bar */}
      <Header
        activeTab={activeTab}
        onOpenGasModal={() => setIsGasModalOpen(true)}
        onRefresh={refreshData}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-lg mx-auto">
        {activeTab === 'defect' && (
          <DefectInputScreen
            lines={lines}
            onDefectAdded={refreshData}
          />
        )}

        {activeTab === 'dashboard' && dashboardData && (
          <DashboardScreen
            dashboard={dashboardData}
            onSelectDate={(newDate) => setSelectedDashboardDate(newDate)}
            onRefresh={refreshData}
            isRefreshing={isRefreshing}
          />
        )}

        {activeTab === 'production' && (
          <ProductionInputScreen
            lines={lines}
            onProductionSaved={refreshData}
          />
        )}

        {activeTab === 'admin' && (
          <AdminScreen
            lines={lines}
            verifiedPin={verifiedPin}
            onRequestPin={() => {
              setPendingTabAfterPin('admin');
              setIsPinModalOpen(true);
            }}
            onDataChanged={refreshData}
            onOpenGasModal={() => setIsGasModalOpen(true)}
          />
        )}
      </main>

      {/* Bottom Sticky Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        highSeverityCount={highSeverityCount}
      />

      {/* PIN Verification Modal */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPendingTabAfterPin(null);
        }}
        onSuccess={handlePinSuccess}
      />

      {/* Google Apps Script & Sheets Guide Modal */}
      <GasModal
        isOpen={isGasModalOpen}
        onClose={() => setIsGasModalOpen(false)}
      />
    </div>
  );
}
