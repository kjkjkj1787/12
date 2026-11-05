/**
 * Date and time utilities for Asia/Seoul (KST) work shifts
 */

export function getTodayDateString(): string {
  // Return YYYY-MM-DD in KST (Asia/Seoul)
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export function getCurrentTimestampString(): string {
  try {
    const now = new Date();
    const dateStr = getTodayDateString();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${dateStr} ${hours}:${minutes}:${seconds}`;
  } catch {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
  }
}

export function formatDateKorean(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[0]}년 ${parseInt(parts[1], 10)}월 ${parseInt(parts[2], 10)}일`;
  }
  return dateStr;
}

export function formatTimeShort(timestamp: string): string {
  if (!timestamp) return '';
  const timePart = timestamp.includes(' ') ? timestamp.split(' ')[1] : timestamp;
  const parts = timePart.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return timePart;
}
