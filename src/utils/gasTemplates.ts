export const GAS_SCRIPTS = {
  'Code.gs': `/**
 * 라인별 불량률 리포트 웹앱 - Google Apps Script Entry Point
 * @license Apache-2.0
 */

function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('라인별 불량률 리포트')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * 공개 API 함수들 (google.script.run에서 호출)
 */
function getBootstrap() {
  return Service.getBootstrapData();
}

function saveDefect(input) {
  return Service.saveDefect(input);
}

function saveProduction(input) {
  return Service.saveProduction(input);
}

function getDashboard(dateStr) {
  return Service.getDashboard(dateStr);
}

function updateDefect(pin, id, changes, reason, modifierName) {
  Auth.verifyPin(pin);
  return Service.updateDefect(id, changes, reason, modifierName);
}

function getDailyReport(pin, dateStr) {
  Auth.verifyPin(pin);
  return Service.getDailyReport(dateStr);
}
`,

  'Auth.gs': `/**
 * 관리자 PIN 인증 모듈
 * PIN은 스크립트 속성(ScriptProperties)에 저장하여 안전하게 관리합니다.
 */
var Auth = (function() {
  var PIN_PROPERTY_KEY = 'ADMIN_PIN';
  var DEFAULT_PIN = '1234';

  function getStoredPin() {
    var props = PropertiesService.getScriptProperties();
    var pin = props.getProperty(PIN_PROPERTY_KEY);
    if (!pin) {
      props.setProperty(PIN_PROPERTY_KEY, DEFAULT_PIN);
      return DEFAULT_PIN;
    }
    return pin;
  }

  function verifyPin(inputPin) {
    if (!inputPin || String(inputPin).trim() !== String(getStoredPin()).trim()) {
      throw new Error('관리자 PIN 번호가 일치하지 않습니다.');
    }
    return true;
  }

  function updatePin(currentPin, newPin) {
    verifyPin(currentPin);
    if (!newPin || String(newPin).length < 4) {
      throw new Error('새 PIN은 4자리 이상이어야 합니다.');
    }
    PropertiesService.getScriptProperties().setProperty(PIN_PROPERTY_KEY, String(newPin));
    return { success: true };
  }

  return {
    verifyPin: verifyPin,
    updatePin: updatePin,
    getStoredPin: getStoredPin
  };
})();
`,

  'Service.gs': `/**
 * 핵심 비즈니스 로직 및 계산 서비스
 */
var Service = (function() {
  function getBootstrapData() {
    var lines = Repository.getLines();
    var now = new Date();
    var todayStr = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd');
    return {
      lines: lines,
      todayDate: todayStr,
      commonDefectTypes: [
        '외관 스크래치', '치수/조립 불량', '기능/동작 불량',
        '이물/오염', '도장/도색 불량', '부품 누락', '기타'
      ]
    };
  }

  function saveDefect(input) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000); // 10초 동시성 대기
      
      if (!input.lineCode || !input.defectType || !input.quantity || input.quantity < 1) {
        throw new Error('필수 입력값 또는 수량(1 이상)이 올바르지 않습니다.');
      }

      var now = new Date();
      var nowKST = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
      var workDate = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd');
      var id = 'DEF-' + Utilities.formatDate(now, 'Asia/Seoul', 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);

      var record = {
        id: id,
        timestamp: nowKST,
        workDate: workDate,
        lineCode: input.lineCode,
        lineName: input.lineName || input.lineCode,
        defectType: input.defectType,
        quantity: parseInt(input.quantity, 10),
        severity: input.severity || '중',
        remarks: input.remarks || '',
        reporterName: input.reporterName || '',
        status: '정상',
        createdAt: nowKST
      };

      Repository.appendDefect(record);
      return { success: true, record: record };
    } finally {
      lock.releaseLock();
    }
  }

  function saveProduction(input) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      if (!input.workDate || !input.lineCode || input.productionQuantity === undefined || input.productionQuantity < 0) {
        throw new Error('작업일, 라인, 생산수량(0 이상)을 확인해주세요.');
      }
      return Repository.upsertProduction(input);
    } finally {
      lock.releaseLock();
    }
  }

  function getDashboard(dateStr) {
    var targetDate = dateStr || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
    var lines = Repository.getLines().filter(function(l) { return l.isActive !== false; });
    var defects = Repository.getDefectsByDate(targetDate);
    var productions = Repository.getProductionsByDate(targetDate);

    // 계산 규칙 적용
    var normalDefects = defects.filter(function(d) { return d.status === '정상'; });
    var totalDefectCount = normalDefects.length;
    var totalDefectQty = 0;
    var highSeverityCount = 0;

    var lineMap = {};
    lines.forEach(function(l) {
      lineMap[l.lineCode] = {
        lineCode: l.lineCode,
        lineName: l.lineName,
        defectCount: 0,
        defectQuantity: 0,
        productionQuantity: null,
        defectRate: null,
        typeDistribution: {},
        highSeverityCount: 0
      };
    });

    normalDefects.forEach(function(d) {
      totalDefectQty += d.quantity;
      if (d.severity === '상') highSeverityCount++;

      var item = lineMap[d.lineCode];
      if (item) {
        item.defectCount++;
        item.defectQuantity += d.quantity;
        if (d.severity === '상') item.highSeverityCount++;
        item.typeDistribution[d.defectType] = (item.typeDistribution[d.defectType] || 0) + d.quantity;
      }
    });

    var totalProdSum = 0;
    var anyProdEntered = false;

    productions.forEach(function(p) {
      var item = lineMap[p.lineCode];
      if (item && p.productionQuantity !== undefined && p.productionQuantity !== null) {
        anyProdEntered = true;
        item.productionQuantity = p.productionQuantity;
        totalProdSum += p.productionQuantity;
        if (p.productionQuantity > 0) {
          item.defectRate = Math.round((item.defectQuantity / p.productionQuantity) * 10000) / 100;
        } else {
          item.defectRate = 0;
        }
      }
    });

    var overallRate = null;
    var totalProd = null;
    if (anyProdEntered && totalProdSum > 0) {
      totalProd = totalProdSum;
      overallRate = Math.round((totalDefectQty / totalProdSum) * 10000) / 100;
    }

    var highSeverityList = normalDefects.filter(function(d) { return d.severity === '상'; });
    highSeverityList.sort(function(a, b) { return (b.timestamp || '').localeCompare(a.timestamp || ''); });

    var lineSummaries = Object.keys(lineMap).map(function(k) { return lineMap[k]; });

    return {
      workDate: targetDate,
      totalDefectCount: totalDefectCount,
      totalDefectQuantity: totalDefectQty,
      totalProductionQuantity: totalProd,
      overallDefectRate: overallRate,
      highSeverityCount: highSeverityCount,
      lineSummaries: lineSummaries,
      highSeverityList: highSeverityList,
      lastUpdated: Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss')
    };
  }

  function updateDefect(id, changes, reason, modifierName) {
    return Repository.updateDefect(id, changes, reason, modifierName);
  }

  function getDailyReport(dateStr) {
    var dashboard = getDashboard(dateStr);
    var allDefects = Repository.getDefectsByDate(dateStr);
    return {
      dashboard: dashboard,
      allDefects: allDefects
    };
  }

  return {
    getBootstrapData: getBootstrapData,
    saveDefect: saveDefect,
    saveProduction: saveProduction,
    getDashboard: getDashboard,
    updateDefect: updateDefect,
    getDailyReport: getDailyReport
  };
})();
`,

  'Repository.gs': `/**
 * 구글 시트 데이터 입출력 (불량기록, 생산실적, 라인, 수정이력)
 */
var Repository = (function() {
  var SHEET_DEFECTS = '불량기록';
  var SHEET_PRODUCTIONS = '생산실적';
  var SHEET_LINES = '라인';
  var SHEET_AUDIT = '수정이력';

  function getSpreadsheet() {
    return SpreadsheetApp.getActiveSpreadsheet();
  }

  function getSheet(name) {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = initSheet(name);
    }
    return sheet;
  }

  function initSheet(name) {
    var ss = getSpreadsheet();
    var sheet = ss.insertSheet(name);
    if (name === SHEET_DEFECTS) {
      sheet.appendRow(['기록ID', '발생일시', '작업일', '라인코드', '라인명', '불량유형', '수량', '심각도', '비고', '입력자', '상태', '등록일시']);
    } else if (name === SHEET_PRODUCTIONS) {
      sheet.appendRow(['실적ID', '작업일', '라인코드', '라인명', '생산수량', '입력자', '입력일시']);
    } else if (name === SHEET_LINES) {
      sheet.appendRow(['라인코드', '라인명', '표시순서', '사용여부']);
      sheet.appendRow(['LINE-01', '1라인 (가공/성형)', 1, true]);
      sheet.appendRow(['LINE-02', '2라인 (조립 1차)', 2, true]);
      sheet.appendRow(['LINE-03', '3라인 (조립 2차)', 3, true]);
      sheet.appendRow(['LINE-04', '4라인 (도장/코팅)', 4, true]);
      sheet.appendRow(['LINE-05', '5라인 (검사/포장)', 5, true]);
    } else if (name === SHEET_AUDIT) {
      sheet.appendRow(['수정일시', '수정자', '대상ID', '작업구분', '변경전', '변경후', '사유']);
    }
    return sheet;
  }

  function getLines() {
    var sheet = getSheet(SHEET_LINES);
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    var lines = [];
    for (var i = 1; i < data.length; i++) {
      lines.push({
        lineCode: String(data[i][0]),
        lineName: String(data[i][1]),
        sortOrder: Number(data[i][2]),
        isActive: Boolean(data[i][3])
      });
    }
    lines.sort(function(a, b) { return a.sortOrder - b.sortOrder; });
    return lines;
  }

  function appendDefect(record) {
    var sheet = getSheet(SHEET_DEFECTS);
    sheet.appendRow([
      record.id,
      record.timestamp,
      record.workDate,
      record.lineCode,
      record.lineName,
      record.defectType,
      record.quantity,
      record.severity,
      record.remarks,
      record.reporterName,
      record.status,
      record.createdAt
    ]);
  }

  function upsertProduction(input) {
    var sheet = getSheet(SHEET_PRODUCTIONS);
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(input.workDate) && String(data[i][2]) === String(input.lineCode)) {
        rowIndex = i + 1;
        break;
      }
    }
    var nowKST = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
    if (rowIndex > -1) {
      sheet.getRange(rowIndex, 5).setValue(input.productionQuantity);
      sheet.getRange(rowIndex, 6).setValue(input.reporterName || '');
      sheet.getRange(rowIndex, 7).setValue(nowKST);
    } else {
      var id = 'PRD-' + input.workDate + '-' + input.lineCode;
      sheet.appendRow([
        id,
        input.workDate,
        input.lineCode,
        input.lineName,
        input.productionQuantity,
        input.reporterName || '',
        nowKST
      ]);
    }
    return { success: true };
  }

  function getDefectsByDate(dateStr) {
    var sheet = getSheet(SHEET_DEFECTS);
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    var list = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (String(row[2]) === String(dateStr)) {
        list.push({
          id: String(row[0]),
          timestamp: String(row[1]),
          workDate: String(row[2]),
          lineCode: String(row[3]),
          lineName: String(row[4]),
          defectType: String(row[5]),
          quantity: Number(row[6]),
          severity: String(row[7]),
          remarks: String(row[8]),
          reporterName: String(row[9]),
          status: String(row[10]),
          createdAt: String(row[11])
        });
      }
    }
    return list;
  }

  function getProductionsByDate(dateStr) {
    var sheet = getSheet(SHEET_PRODUCTIONS);
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    var list = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (String(row[1]) === String(dateStr)) {
        list.push({
          id: String(row[0]),
          workDate: String(row[1]),
          lineCode: String(row[2]),
          lineName: String(row[3]),
          productionQuantity: Number(row[4]),
          reporterName: String(row[5]),
          updatedAt: String(row[6])
        });
      }
    }
    return list;
  }

  function updateDefect(id, changes, reason, modifierName) {
    var sheet = getSheet(SHEET_DEFECTS);
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    var beforeRecord = null;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        rowIndex = i + 1;
        beforeRecord = {
          id: String(data[i][0]),
          timestamp: String(data[i][1]),
          workDate: String(data[i][2]),
          lineCode: String(data[i][3]),
          defectType: String(data[i][5]),
          quantity: Number(data[i][6]),
          severity: String(data[i][7]),
          remarks: String(data[i][8]),
          status: String(data[i][10])
        };
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error('대상을 찾을 수 없습니다: ' + id);
    }

    if (changes.quantity !== undefined) sheet.getRange(rowIndex, 7).setValue(changes.quantity);
    if (changes.defectType !== undefined) sheet.getRange(rowIndex, 6).setValue(changes.defectType);
    if (changes.severity !== undefined) sheet.getRange(rowIndex, 8).setValue(changes.severity);
    if (changes.remarks !== undefined) sheet.getRange(rowIndex, 9).setValue(changes.remarks);
    if (changes.status !== undefined) sheet.getRange(rowIndex, 11).setValue(changes.status);

    // 수정이력 기록 (Audit Log)
    var auditSheet = getSheet(SHEET_AUDIT);
    var nowKST = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
    auditSheet.appendRow([
      nowKST,
      modifierName || '관리자',
      id,
      changes.status === '취소' ? '취소' : '수정',
      JSON.stringify(beforeRecord),
      JSON.stringify(changes),
      reason || '관리자 변경'
    ]);

    return { success: true };
  }

  return {
    getLines: getLines,
    appendDefect: appendDefect,
    upsertProduction: upsertProduction,
    getDefectsByDate: getDefectsByDate,
    getProductionsByDate: getProductionsByDate,
    updateDefect: updateDefect
  };
})();
`,

  'appsscript.json': `{
  "timeZone": "Asia/Seoul",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE"
  }
}`
};
