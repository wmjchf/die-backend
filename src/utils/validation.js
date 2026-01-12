// 验证手机号（中国大陆）
export function isValidPhone(phone) {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

// 验证时区
export function isValidTimezone(timezone) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

