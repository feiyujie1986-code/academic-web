interface LabelStyle {
  color: string
  background: string
  border: string
}

const LABEL_COLOR_MAP: Record<string, LabelStyle> = {
  会友: { color: "#409eff", background: "#ecf5ff", border: "#d9ecff" },
  教师: { color: "#17a589", background: "#e8f8f5", border: "#a9dfbf" },
  长执: { color: "#7d3c98", background: "#f5eef8", border: "#d2b4de" },
  事工同工: { color: "#e67e22", background: "#fef9e7", border: "#fad7a0" },
  新人: { color: "#909399", background: "#f4f4f5", border: "#d3d4d6" },
  牧长: { color: "#2471a3", background: "#eaf4fb", border: "#aed6f1" },
  超级管理员: { color: "#f56c6c", background: "#fef0f0", border: "#fde2e2" }
}

const DEFAULT_LABEL_STYLE: LabelStyle = { color: "#409eff", background: "#ecf5ff", border: "#d9ecff" }

export function getUserTypeLabelStyle(label: string): LabelStyle {
  return LABEL_COLOR_MAP[label] ?? DEFAULT_LABEL_STYLE
}

/** 返回 Vue el-tag :style 兼容格式 */
export function getUserTypeLabelCssStyle(label: string): Record<string, string> {
  const s = getUserTypeLabelStyle(label)
  return { backgroundColor: s.background, color: s.color, borderColor: s.border }
}
