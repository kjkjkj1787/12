import { LineItem, DefectRecord, ProductionRecord, AuditLog, SeverityLevel, RecordStatus } from '../types';
import { DEFAULT_LINES, COMMON_DEFECT_TYPES, DEFAULT_ADMIN_PIN, getInitialSeedData } from './defaults';
import { getTodayDateString, getCurrentTimestampString } from './date';

const STORAGE_KEY_DEFECTS = 'line_defect_records_v1';
const STORAGE_KEY_PRODUCTIONS = 'line_production_records_v1';
const STORAGE_KEY_LINES = 'line_master_v1';
const STORAGE_KEY_AUDIT = 'line_audit_logs_v1';
const STORAGE_KEY_PIN = 'line_admin_pin_v1';

export class AppDataStore {
  private static instance: AppDataStore;

  private constructor() {
    this.ensureInitialized();
  }

  public static getInstance(): AppDataStore {
    if (!AppDataStore.instance) {
      AppDataStore.instance = new AppDataStore();
    }
    return AppDataStore.instance;
  }

  private ensureInitialized(): void {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(STORAGE_KEY_LINES)) {
      localStorage.setItem(STORAGE_KEY_LINES, JSON.stringify(DEFAULT_LINES));
    }

    if (!localStorage.getItem(STORAGE_KEY_PIN)) {
      localStorage.setItem(STORAGE_KEY_PIN, DEFAULT_ADMIN_PIN);
    }

    if (!localStorage.getItem(STORAGE_KEY_DEFECTS)) {
      const seed = getInitialSeedData();
      localStorage.setItem(STORAGE_KEY_DEFECTS, JSON.stringify(seed.defects));
      localStorage.setItem(STORAGE_KEY_PRODUCTIONS, JSON.stringify(seed.productions));
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify([]));
    }
  }

  public getLines(): LineItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LINES);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Error reading lines from storage:', e);
    }
    return DEFAULT_LINES;
  }

  public saveLines(lines: LineItem[]): void {
    localStorage.setItem(STORAGE_KEY_LINES, JSON.stringify(lines));
  }

  public getDefects(workDate?: string): DefectRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DEFECTS);
      const list: DefectRecord[] = raw ? JSON.parse(raw) : [];
      if (workDate) {
        return list.filter((item) => item.workDate === workDate);
      }
      return list;
    } catch (e) {
      console.error('Error reading defects:', e);
      return [];
    }
  }

  public addDefect(input: {
    lineCode: string;
    lineName: string;
    defectType: string;
    quantity: number;
    severity: SeverityLevel;
    remarks?: string;
    reporterName?: string;
    workDate?: string;
  }): DefectRecord {
    const defects = this.getDefects();
    const nowTimestamp = getCurrentTimestampString();
    const workDate = input.workDate || getTodayDateString();

    const newId = `DEF-${workDate.replace(/-/g, '')}-${String(defects.length + 1).padStart(3, '0')}`;

    const newRecord: DefectRecord = {
      id: newId,
      timestamp: nowTimestamp,
      workDate,
      lineCode: input.lineCode,
      lineName: input.lineName,
      defectType: input.defectType,
      quantity: Math.max(1, Math.floor(input.quantity)),
      severity: input.severity,
      remarks: (input.remarks || '').trim(),
      reporterName: (input.reporterName || '').trim(),
      status: '정상',
      createdAt: nowTimestamp,
    };

    defects.unshift(newRecord);
    localStorage.setItem(STORAGE_KEY_DEFECTS, JSON.stringify(defects));
    return newRecord;
  }

  public getProductions(workDate?: string): ProductionRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PRODUCTIONS);
      const list: ProductionRecord[] = raw ? JSON.parse(raw) : [];
      if (workDate) {
        return list.filter((item) => item.workDate === workDate);
      }
      return list;
    } catch (e) {
      console.error('Error reading productions:', e);
      return [];
    }
  }

  public upsertProduction(input: {
    workDate: string;
    lineCode: string;
    lineName: string;
    productionQuantity: number;
    reporterName?: string;
  }): ProductionRecord {
    const productions = this.getProductions();
    const nowTimestamp = getCurrentTimestampString();

    const existingIndex = productions.findIndex(
      (p) => p.workDate === input.workDate && p.lineCode === input.lineCode
    );

    const record: ProductionRecord = {
      id: `PRD-${input.workDate}-${input.lineCode}`,
      workDate: input.workDate,
      lineCode: input.lineCode,
      lineName: input.lineName,
      productionQuantity: Math.max(0, Math.floor(input.productionQuantity)),
      reporterName: (input.reporterName || '').trim(),
      updatedAt: nowTimestamp,
    };

    if (existingIndex >= 0) {
      productions[existingIndex] = record;
    } else {
      productions.push(record);
    }

    localStorage.setItem(STORAGE_KEY_PRODUCTIONS, JSON.stringify(productions));
    return record;
  }

  public verifyAdminPin(pin: string): boolean {
    const storedPin = localStorage.getItem(STORAGE_KEY_PIN) || DEFAULT_ADMIN_PIN;
    return String(pin).trim() === String(storedPin).trim();
  }

  public changeAdminPin(currentPin: string, newPin: string): boolean {
    if (!this.verifyAdminPin(currentPin)) {
      throw new Error('현재 PIN 번호가 올바르지 않습니다.');
    }
    if (!newPin || newPin.trim().length < 4) {
      throw new Error('새 PIN은 4자리 이상이어야 합니다.');
    }
    localStorage.setItem(STORAGE_KEY_PIN, newPin.trim());
    return true;
  }

  public updateDefect(
    pin: string,
    id: string,
    changes: {
      quantity?: number;
      defectType?: string;
      severity?: SeverityLevel;
      remarks?: string;
      status?: RecordStatus;
    },
    reason: string,
    modifierName?: string
  ): DefectRecord {
    if (!this.verifyAdminPin(pin)) {
      throw new Error('관리자 PIN 인증에 실패했습니다.');
    }

    const defects = this.getDefects();
    const index = defects.findIndex((d) => d.id === id);
    if (index === -1) {
      throw new Error(`불량 기록을 찾을 수 없습니다. (ID: ${id})`);
    }

    const before = { ...defects[index] };
    const nowTimestamp = getCurrentTimestampString();

    const updated: DefectRecord = {
      ...defects[index],
      ...changes,
      updatedAt: nowTimestamp,
    };

    defects[index] = updated;
    localStorage.setItem(STORAGE_KEY_DEFECTS, JSON.stringify(defects));

    // Audit log recording
    const auditLogs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `AUDIT-${Date.now()}`,
      timestamp: nowTimestamp,
      modifierName: (modifierName || '관리자').trim(),
      targetId: id,
      action: changes.status === '취소' ? '취소' : '수정',
      before,
      after: changes,
      reason: (reason || '사유 미입력').trim(),
    };
    auditLogs.unshift(newLog);
    localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(auditLogs));

    return updated;
  }

  public getAuditLogs(): AuditLog[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_AUDIT);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public resetToSample(): void {
    const seed = getInitialSeedData();
    localStorage.setItem(STORAGE_KEY_LINES, JSON.stringify(DEFAULT_LINES));
    localStorage.setItem(STORAGE_KEY_DEFECTS, JSON.stringify(seed.defects));
    localStorage.setItem(STORAGE_KEY_PRODUCTIONS, JSON.stringify(seed.productions));
    localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEY_PIN, DEFAULT_ADMIN_PIN);
  }
}

export const store = AppDataStore.getInstance();
