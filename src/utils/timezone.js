/**
 * 时区工具函数
 * 统一使用中国时区（Asia/Shanghai, UTC+8）处理所有时间
 */

const CHINA_TIMEZONE_OFFSET = 8 * 60 * 60 * 1000; // 8小时的毫秒数

/**
 * 获取中国时区的当前时间（作为 Date 对象）
 * @returns {Date} 表示中国时区当前时间的 Date 对象
 */
export function getChinaTime() {
  const now = new Date();
  // 获取 UTC 时间戳
  const utcTimestamp = now.getTime();
  // 转换为中国时区时间戳（加上8小时）
  const chinaTimestamp = utcTimestamp + CHINA_TIMEZONE_OFFSET;
  // 创建一个新的 Date 对象（内部存储 UTC 时间，但表示的是中国时区时间）
  return new Date(chinaTimestamp);
}

/**
 * 格式化日期时间为 MySQL DATETIME 格式（中国时区）
 * 将 Date 对象格式化为中国时区的日期时间字符串
 * @param {Date} date - 日期对象
 * @returns {string} MySQL DATETIME 格式字符串 (YYYY-MM-DD HH:MM:SS)，表示中国时区时间
 */
export function formatMySQLDateTime(date) {
  // 将 Date 对象转换为中国时区时间
  // date 内部存储的是 UTC 时间戳，我们需要加上8小时偏移来获取中国时区时间
  const chinaTimestamp = date.getTime() + CHINA_TIMEZONE_OFFSET;
  const chinaDate = new Date(chinaTimestamp);
  
  // 使用 UTC 方法获取中国时区的时间（因为我们已经加上了偏移）
  const year = chinaDate.getUTCFullYear();
  const month = String(chinaDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(chinaDate.getUTCDate()).padStart(2, '0');
  const hours = String(chinaDate.getUTCHours()).padStart(2, '0');
  const minutes = String(chinaDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(chinaDate.getUTCSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 将 MySQL DATETIME 字符串（中国时区）转换为 Date 对象
 * @param {string} mysqlDateTime - MySQL DATETIME 格式字符串 (YYYY-MM-DD HH:MM:SS)
 * @returns {Date} Date 对象
 */
export function parseMySQLDateTime(mysqlDateTime) {
  // MySQL DATETIME 存储的是中国时区时间（无时区信息）
  // 解析为 Date 对象时，需要减去8小时偏移，得到 UTC 时间
  const [datePart, timePart] = mysqlDateTime.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  
  // 创建 UTC 时间（减去8小时偏移）
  const utcTimestamp = Date.UTC(year, month - 1, day, hours, minutes, seconds || 0) - CHINA_TIMEZONE_OFFSET;
  return new Date(utcTimestamp);
}

/**
 * 获取中国时区的今天开始时间（00:00:00）
 * @returns {Date} 今天 00:00:00 的 Date 对象
 */
export function getChinaTodayStart() {
  const chinaTime = getChinaTime();
  // getChinaTime() 返回的 Date 对象已经加上了8小时偏移
  // 所以 getUTCFullYear() 等方法返回的是中国时区时间
  const year = chinaTime.getUTCFullYear();
  const month = chinaTime.getUTCMonth();
  const day = chinaTime.getUTCDate();
  
  // 创建今天 00:00:00 的中国时区时间
  // Date.UTC 创建的是 UTC 时间戳，我们需要减去8小时得到正确的 UTC 时间戳
  const utcTimestamp = Date.UTC(year, month, day, 0, 0, 0) - CHINA_TIMEZONE_OFFSET;
  return new Date(utcTimestamp);
}

/**
 * 获取中国时区的今天结束时间（23:59:59）
 * @returns {Date} 今天 23:59:59 的 Date 对象
 */
export function getChinaTodayEnd() {
  const chinaTime = getChinaTime();
  // getChinaTime() 返回的 Date 对象已经加上了8小时偏移
  // 所以 getUTCFullYear() 等方法返回的是中国时区时间
  const year = chinaTime.getUTCFullYear();
  const month = chinaTime.getUTCMonth();
  const day = chinaTime.getUTCDate();
  
  // 创建今天 23:59:59 的中国时区时间
  // Date.UTC 创建的是 UTC 时间戳，我们需要减去8小时得到正确的 UTC 时间戳
  const utcTimestamp = Date.UTC(year, month, day, 23, 59, 59) - CHINA_TIMEZONE_OFFSET;
  return new Date(utcTimestamp);
}

