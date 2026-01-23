/**
 * 时区工具函数
 * 使用 TIMESTAMP 类型，MySQL 会自动处理时区转换
 * 所有时间操作都基于 JavaScript Date 对象（UTC 时间）
 */

/**
 * 获取当前时间
 * @returns {Date} 当前时间的 Date 对象
 */
export function getChinaTime() {
  return new Date();
}

/**
 * 格式化日期时间为 MySQL TIMESTAMP 格式字符串
 * 用于 SQL 查询中的日期比较（如 DATE() 函数）
 * 对于 INSERT/UPDATE，可以直接使用 Date 对象，mysql2 会自动处理
 * @param {Date} date - 日期对象
 * @returns {string} MySQL TIMESTAMP 格式字符串 (YYYY-MM-DD HH:MM:SS)
 */
export function formatMySQLDateTime(date) {
  // 对于 TIMESTAMP，mysql2 会自动处理 Date 对象
  // 但为了兼容需要字符串的场景（如 DATE() 比较），返回格式化字符串
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 将 MySQL TIMESTAMP 转换为 Date 对象
 * mysql2 已经自动将 TIMESTAMP 转换为 Date 对象，所以这里只需要处理边界情况
 * @param {Date|string|null|undefined} mysqlTimestamp - MySQL TIMESTAMP（可能是 Date 对象或字符串）
 * @returns {Date|null} Date 对象，如果输入无效则返回 null
 */
export function parseMySQLDateTime(mysqlTimestamp) {
  // mysql2 已经将 TIMESTAMP 转换为 Date 对象
  if (mysqlTimestamp instanceof Date) {
    return mysqlTimestamp;
  }
  
  // 如果是字符串，尝试解析
  if (typeof mysqlTimestamp === 'string') {
    const date = new Date(mysqlTimestamp);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // 其他情况返回 null
  return null;
}

/**
 * 获取中国时区的今天开始时间（00:00:00）
 * @returns {Date} 今天 00:00:00 的 Date 对象（UTC 时间）
 */
export function getChinaTodayStart() {
  const now = new Date();
  // 获取中国时区的当前时间字符串
  const chinaDateStr = now.toLocaleString('en-US', { 
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // 解析为中国时区的日期（格式：MM/DD/YYYY, HH:MM:SS）
  const [datePart, timePart] = chinaDateStr.split(', ');
  const [month, day, year] = datePart.split('/').map(Number);
  
  // 创建中国时区今天 00:00:00 的 Date 对象
  // 使用 Date.UTC 创建 UTC 时间，然后减去 8 小时偏移
  const CHINA_OFFSET = 8 * 60 * 60 * 1000; // 8小时
  const utcTimestamp = Date.UTC(year, month - 1, day, 0, 0, 0) - CHINA_OFFSET;
  return new Date(utcTimestamp);
}

/**
 * 获取中国时区的今天结束时间（23:59:59）
 * @returns {Date} 今天 23:59:59 的 Date 对象（UTC 时间）
 */
export function getChinaTodayEnd() {
  const now = new Date();
  // 获取中国时区的当前时间字符串
  const chinaDateStr = now.toLocaleString('en-US', { 
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // 解析为中国时区的日期（格式：MM/DD/YYYY, HH:MM:SS）
  const [datePart] = chinaDateStr.split(', ');
  const [month, day, year] = datePart.split('/').map(Number);
  
  // 创建中国时区今天 23:59:59 的 Date 对象
  // 使用 Date.UTC 创建 UTC 时间，然后减去 8 小时偏移
  const CHINA_OFFSET = 8 * 60 * 60 * 1000; // 8小时
  const utcTimestamp = Date.UTC(year, month - 1, day, 23, 59, 59, 999) - CHINA_OFFSET;
  return new Date(utcTimestamp);
}
