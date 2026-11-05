export type SeverityLevel = '상' | '중' | '하';
export type RecordStatus = '정상' | '취소';

export interface LineItem {
  lineCode: string;
  lineName: string;
  sortOrder: number;
  isActive: boolean;
  department?: string;
}

export interface DefectRecord {
  id: string;
  timestamp: string; // e.g., '2026-11-05 09:14:22'
  workDate: string;  // e.g., '2026-11-05'
  lineCode: string;
  lineName: string;
  defectType: string;
  quantity: number;
  severity: SeverityLevel;
  remarks: string;
  reporterName: string;
  status: RecordStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductionRecord {
  id: string;
  workDate: string;
  lineCode: string;
  lineName: string;
  productionQuantity: number;
  reporterName: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  modifierName: string;
  targetId: string;
  action: '수정' | '취소';
  before: Partial<DefectRecord>;
  after: Partial<DefectRecord>;
  reason: string;
}

export interface LineSummary {
  lineCode: string;
  lineName: string;
  defectCount: number;
  defectQuantity: number;
  productionQuantity: number | null; // null if not entered
  defectRate: number | null;         // percentage (e.g. 1.25), null if not entered
  typeDistribution: Record<string, number>;
  highSeverityCount: number;
}

export interface DashboardData {
  workDate: string;
  totalDefectCount: number;
  totalDefectQuantity: number;
  totalProductionQuantity: number | null;
  overallDefectRate: number | null;
  highSeverityCount: number;
  lineSummaries: LineSummary[];
  highSeverityList: DefectRecord[];
  lastUpdated: string;
}

export interface BootstrapData {
  lines: LineItem[];
  commonDefectTypes: string[];
  todayDate: string;
  serverTime: string;
}
