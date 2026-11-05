import { LineItem, DefectRecord, ProductionRecord } from '../types';
import { getTodayDateString } from './date';

export const DEFAULT_LINES: LineItem[] = [
  { lineCode: 'LINE-01', lineName: '1라인 (가공/성형)', sortOrder: 1, isActive: true, department: '가공반' },
  { lineCode: 'LINE-02', lineName: '2라인 (조립 1차)', sortOrder: 2, isActive: true, department: '조립반' },
  { lineCode: 'LINE-03', lineName: '3라인 (조립 2차)', sortOrder: 3, isActive: true, department: '조립반' },
  { lineCode: 'LINE-04', lineName: '4라인 (도장/코팅)', sortOrder: 4, isActive: true, department: '표면반' },
  { lineCode: 'LINE-05', lineName: '5라인 (검사/포장)', sortOrder: 5, isActive: true, department: '검사반' },
];

export const COMMON_DEFECT_TYPES: string[] = [
  '외관 스크래치',
  '치수/조립 불량',
  '기능/동작 불량',
  '이물/오염',
  '도장/도색 불량',
  '용접/접합 불량',
  '부품 누락',
  '기타',
];

export const DEFAULT_ADMIN_PIN = '1234';

export function getInitialSeedData(): {
  defects: DefectRecord[];
  productions: ProductionRecord[];
} {
  const today = getTodayDateString();

  const defects: DefectRecord[] = [
    {
      id: 'DEF-1001',
      timestamp: `${today} 08:42:15`,
      workDate: today,
      lineCode: 'LINE-01',
      lineName: '1라인 (가공/성형)',
      defectType: '치수/조립 불량',
      quantity: 3,
      severity: '중',
      remarks: '가공 척 고정압력 미달로 인한 편심 발생',
      reporterName: '박정우',
      status: '정상',
      createdAt: `${today} 08:42:15`,
    },
    {
      id: 'DEF-1002',
      timestamp: `${today} 09:15:30`,
      workDate: today,
      lineCode: 'LINE-04',
      lineName: '4라인 (도장/코팅)',
      defectType: '도장/도색 불량',
      quantity: 5,
      severity: '상',
      remarks: '스프레이 노즐 막힘으로 인한 뭉침 현상 (긴급 점검 요청)',
      reporterName: '이민수',
      status: '정상',
      createdAt: `${today} 09:15:30`,
    },
    {
      id: 'DEF-1003',
      timestamp: `${today} 10:20:05`,
      workDate: today,
      lineCode: 'LINE-02',
      lineName: '2라인 (조립 1차)',
      defectType: '외관 스크래치',
      quantity: 2,
      severity: '하',
      remarks: '이송 트레이 모서리 접촉 흔적',
      reporterName: '김성현',
      status: '정상',
      createdAt: `${today} 10:20:05`,
    },
    {
      id: 'DEF-1004',
      timestamp: `${today} 11:05:44`,
      workDate: today,
      lineCode: 'LINE-03',
      lineName: '3라인 (조립 2차)',
      defectType: '기능/동작 불량',
      quantity: 1,
      severity: '상',
      remarks: '모터 구동 전류 이상 및 간헐적 멈춤 현상 발생',
      reporterName: '정다혜',
      status: '정상',
      createdAt: `${today} 11:05:44`,
    },
    {
      id: 'DEF-1005',
      timestamp: `${today} 13:40:12`,
      workDate: today,
      lineCode: 'LINE-05',
      lineName: '5라인 (검사/포장)',
      defectType: '부품 누락',
      quantity: 4,
      severity: '중',
      remarks: '체결 와셔 1종 누락 감지',
      reporterName: '최진호',
      status: '정상',
      createdAt: `${today} 13:40:12`,
    },
    {
      id: 'DEF-1006',
      timestamp: `${today} 14:10:00`,
      workDate: today,
      lineCode: 'LINE-01',
      lineName: '1라인 (가공/성형)',
      defectType: '이물/오염',
      quantity: 2,
      severity: '하',
      remarks: '절삭유 잔여 오염물 세척 필요',
      reporterName: '박정우',
      status: '정상',
      createdAt: `${today} 14:10:00`,
    },
    {
      id: 'DEF-1007',
      timestamp: `${today} 14:55:20`,
      workDate: today,
      lineCode: 'LINE-04',
      lineName: '4라인 (도장/코팅)',
      defectType: '외관 스크래치',
      quantity: 3,
      severity: '중',
      remarks: '건조 후 적재 과정에서 마찰 스크래치',
      reporterName: '이민수',
      status: '정상',
      createdAt: `${today} 14:55:20`,
    },
    {
      id: 'DEF-1008',
      timestamp: `${today} 15:30:10`,
      workDate: today,
      lineCode: 'LINE-02',
      lineName: '2라인 (조립 1차)',
      defectType: '기능/동작 불량',
      quantity: 2,
      severity: '상',
      remarks: '스위치 접점 저항 기준치 초과 불량',
      reporterName: '김성현',
      status: '정상',
      createdAt: `${today} 15:30:10`,
    },
  ];

  // Pre-seed some production quantities (e.g. Line 1, 2, 4 entered, Line 3 & 5 pending to verify '집계 전' logic!)
  const productions: ProductionRecord[] = [
    {
      id: `PRD-${today}-LINE-01`,
      workDate: today,
      lineCode: 'LINE-01',
      lineName: '1라인 (가공/성형)',
      productionQuantity: 850,
      reporterName: '홍길동 반장',
      updatedAt: `${today} 16:00:00`,
    },
    {
      id: `PRD-${today}-LINE-02`,
      workDate: today,
      lineCode: 'LINE-02',
      lineName: '2라인 (조립 1차)',
      productionQuantity: 620,
      reporterName: '김성현',
      updatedAt: `${today} 16:05:00`,
    },
    {
      id: `PRD-${today}-LINE-04`,
      workDate: today,
      lineCode: 'LINE-04',
      lineName: '4라인 (도장/코팅)',
      productionQuantity: 740,
      reporterName: '이민수',
      updatedAt: `${today} 16:10:00`,
    },
  ];

  return { defects, productions };
}
