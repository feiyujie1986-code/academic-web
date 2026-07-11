/** 分转元，统一两位小数展示（如 5000 => "50.00"） */
export function formatMoney(fen: number): string {
  return ((fen || 0) / 100).toFixed(2)
}

/** 元转分，输入框按元填写、提交前调用（四舍五入避免浮点误差） */
export function yuanToFen(yuan: number): number {
  return Math.round((yuan || 0) * 100)
}
