import { DefectRecord, ProductionRecord, LineItem, DashboardData, LineSummary } from '../types';
import { getCurrentTimestampString } from './date';

export function calculateDashboardData(
  workDate: string,
  lines: LineItem[],
  defects: DefectRecord[],
  productions: ProductionRecord[]
): DashboardData {
  // Filter for specific work date and active/normal status
  const dateDefects = defects.filter(
    (d) => d.workDate === workDate && d.status === '정상'
  );

  const dateProductions = productions.filter(
    (p) => p.workDate === workDate
  );

  const activeLines = lines.filter((l) => l.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

  let totalDefectCount = 0;
  let totalDefectQuantity = 0;
  let totalProductionQuantity: number | null = null;
  let totalProductionEnteredSum = 0;
  let hasAnyProductionEntered = false;
  let highSeverityCount = 0;

  const lineSummaries: LineSummary[] = activeLines.map((line) => {
    const lineDefects = dateDefects.filter((d) => d.lineCode === line.lineCode);
    const lineProd = dateProductions.find((p) => p.lineCode === line.lineCode);

    const defectCount = lineDefects.length;
    const defectQuantity = lineDefects.reduce((sum, d) => sum + d.quantity, 0);
    const lineHighSev = lineDefects.filter((d) => d.severity === '상').length;

    totalDefectCount += defectCount;
    totalDefectQuantity += defectQuantity;
    highSeverityCount += lineHighSev;

    let productionQuantity: number | null = null;
    let defectRate: number | null = null;

    if (lineProd && lineProd.productionQuantity !== undefined && lineProd.productionQuantity !== null) {
      productionQuantity = lineProd.productionQuantity;
      hasAnyProductionEntered = true;
      totalProductionEnteredSum += productionQuantity;
      if (productionQuantity > 0) {
        defectRate = Math.round((defectQuantity / productionQuantity) * 10000) / 100;
      } else {
        defectRate = 0;
      }
    }

    // Defect type distribution
    const typeDistribution: Record<string, number> = {};
    lineDefects.forEach((d) => {
      typeDistribution[d.defectType] = (typeDistribution[d.defectType] || 0) + d.quantity;
    });

    return {
      lineCode: line.lineCode,
      lineName: line.lineName,
      defectCount,
      defectQuantity,
      productionQuantity,
      defectRate,
      typeDistribution,
      highSeverityCount: lineHighSev,
    };
  });

  // Calculate overall defect rate:
  // PRD: "전체 불량률은 라인별 불량률의 평균이 아니라 합계로 계산한다. 생산 수량 미입력 시 '집계 전'"
  let overallDefectRate: number | null = null;
  if (hasAnyProductionEntered && totalProductionEnteredSum > 0) {
    totalProductionQuantity = totalProductionEnteredSum;
    overallDefectRate = Math.round((totalDefectQuantity / totalProductionEnteredSum) * 10000) / 100;
  } else if (hasAnyProductionEntered && totalProductionEnteredSum === 0) {
    totalProductionQuantity = 0;
    overallDefectRate = 0;
  }

  // High severity list for dateDefects, sorted newest first
  const highSeverityList = dateDefects
    .filter((d) => d.severity === '상')
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

  return {
    workDate,
    totalDefectCount,
    totalDefectQuantity,
    totalProductionQuantity,
    overallDefectRate,
    highSeverityCount,
    lineSummaries,
    highSeverityList,
    lastUpdated: getCurrentTimestampString(),
  };
}
