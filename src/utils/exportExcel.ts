import { DashboardData, DefectRecord } from '../types';
import { formatDateKorean, getCurrentTimestampString } from './date';

/**
 * Generates an Excel-compatible CSV file with UTF-8 BOM so Korean text never breaks in Excel.
 */
export function generateDailyReportCSV(
  dashboard: DashboardData,
  allDayDefects: DefectRecord[]
): void {
  const dateFormatted = dashboard.workDate.replace(/-/g, '');
  const fileName = `불량률_일간리포트_${dateFormatted}.csv`;

  const rows: string[][] = [];

  // Helper to escape CSV cell
  const escape = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Section 1: Header Meta
  rows.push(['[라인별 불량률 일간 리포트]']);
  rows.push(['작업일자', dashboard.workDate, `(${formatDateKorean(dashboard.workDate)})`]);
  rows.push(['출력일시', getCurrentTimestampString()]);
  rows.push([]);

  // Section 2: Overall KPIs
  rows.push(['[당일 전체 요약 종합 지표]']);
  rows.push([
    '누적 불량 건수',
    '총 불량 수량',
    '총 생산 수량',
    '전체 불량률(%)',
    '심각도 [상] 건수',
  ]);
  rows.push([
    `${dashboard.totalDefectCount}건`,
    `${dashboard.totalDefectQuantity.toLocaleString()}개`,
    dashboard.totalProductionQuantity !== null
      ? `${dashboard.totalProductionQuantity.toLocaleString()}개`
      : '집계 전',
    dashboard.overallDefectRate !== null
      ? `${dashboard.overallDefectRate.toFixed(2)}%`
      : '집계 전',
    `${dashboard.highSeverityCount}건`,
  ]);
  rows.push([]);

  // Section 3: Line-by-Line Summary Table
  rows.push(['[라인별 생산 실적 및 불량률 현황]']);
  rows.push([
    '라인코드',
    '라인명',
    '생산수량(투입)',
    '불량건수',
    '불량수량',
    '불량률(%)',
    '심각도[상]건수',
    '상태',
  ]);

  dashboard.lineSummaries.forEach((line) => {
    rows.push([
      line.lineCode,
      line.lineName,
      line.productionQuantity !== null ? line.productionQuantity.toLocaleString() : '미입력',
      line.defectCount.toString(),
      line.defectQuantity.toLocaleString(),
      line.defectRate !== null ? `${line.defectRate.toFixed(2)}%` : '집계 전',
      line.highSeverityCount.toString(),
      line.productionQuantity !== null ? '집계완료' : '생산수량 미입력',
    ]);
  });
  rows.push([]);

  // Section 4: Defect Type Breakdown per Line
  rows.push(['[라인별 불량 유형 분포 현황]']);
  const allTypesSet = new Set<string>();
  dashboard.lineSummaries.forEach((l) => {
    Object.keys(l.typeDistribution).forEach((t) => allTypesSet.add(t));
  });
  const allTypes = Array.from(allTypesSet);
  if (allTypes.length === 0) {
    allTypes.push('외관 스크래치', '치수/조립 불량', '기능/동작 불량', '이물/오염', '도장/도색 불량');
  }

  rows.push(['라인명', ...allTypes, '유형 합계']);
  dashboard.lineSummaries.forEach((line) => {
    const rowCounts = allTypes.map((t) => (line.typeDistribution[t] || 0).toString());
    const sum = Object.values(line.typeDistribution).reduce((a, b) => a + b, 0);
    rows.push([line.lineName, ...rowCounts, sum.toString()]);
  });
  rows.push([]);

  // Section 5: Defect Details
  rows.push(['[당일 불량 상세 발생 기록]']);
  rows.push([
    '기록ID',
    '발생일시',
    '라인코드',
    '라인명',
    '불량유형',
    '불량수량',
    '심각도',
    '입력자',
    '상태',
    '비고/조치사항',
  ]);

  if (allDayDefects.length === 0) {
    rows.push(['해당 일자에 등록된 불량 기록이 없습니다.']);
  } else {
    allDayDefects.forEach((record) => {
      rows.push([
        record.id,
        record.timestamp,
        record.lineCode,
        record.lineName,
        record.defectType,
        record.quantity.toString(),
        record.severity,
        record.reporterName || '(미입력)',
        record.status,
        record.remarks || '',
      ]);
    });
  }

  // Prepend UTF-8 BOM (\uFEFF)
  const csvContent =
    '\uFEFF' +
    rows.map((row) => row.map(escape).join(',')).join('\r\n');

  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
