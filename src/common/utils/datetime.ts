import dayjs from "dayjs"

const INVALID_DATE = "N/A"

/** 格式化日期时间 */
export function formatDateTime(datetime: string | number | Date = "", template: string = "YYYY-MM-DD HH:mm:ss") {
  const day = dayjs(datetime)
  return day.isValid() ? day.format(template) : INVALID_DATE
}

/**
 * 获取时间字符串的年月日部分
 * @param dateTimeString - 完整的时间字符串，格式如 "2025-10-20 20:20:30"
 * @returns 年月日字符串，格式如 "2025-10-20"
 */
export function formatDate(dateTimeString: string): string {
  if (!dateTimeString) return ""
  return dateTimeString.split(" ")[0] || ""
}
