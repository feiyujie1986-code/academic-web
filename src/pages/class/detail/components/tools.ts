import lessonDiscussImg from "@@/assets/images/lesson-discuss.png?url"
import lessonLiveImg from "@@/assets/images/lesson-live.png?url"
import lessonTextImg from "@@/assets/images/lesson-text.png?url"
import lessonVideoImg from "@@/assets/images/lesson-video.png?url"
import lessonWorkImg from "@@/assets/images/lesson-work.png?url"

export function formatDate(dateTimeString: string): string {
  if (!dateTimeString) return ""
  return dateTimeString.split(" ")[0] || ""
}

export function formatTime(dateTimeString: string): string {
  if (!dateTimeString) return ""
  const timePart = dateTimeString.split(" ")[1]
  if (!timePart) return ""
  return timePart.substring(0, 5)
}

export function copyToClipboard(text: string) {
  if (!text) {
    // caller may use UI messaging
    return Promise.reject(new Error("没有可复制的内容"))
  }
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  }
  return new Promise<void>((resolve, reject) => {
    const textArea = document.createElement("textarea")
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      const successful = document.execCommand("copy")
      document.body.removeChild(textArea)
      if (successful) resolve()
      else reject(new Error("复制失败"))
    } catch (err) {
      document.body.removeChild(textArea)
      reject(err)
    }
  })
}

/**
 * 可接课节类型枚举
 *
 * 说明：用于标识课程小节的类型，便于在代码中使用具名常量而不是魔法数字。
 * 值与后端/数据库保持一致：
 * - Video (录播视频) => 1
 * - Text  (图文课)   => 2
 * - Live  (直播课)   => 3
 * - Discuss (讨论课) => 4
 * - Work  (作业任务) => 5
 */
export enum LessonType {
  /** 录播视频 */
  Video = 1,
  /** 图文课 */
  Text = 2,
  /** 直播课 */
  Live = 3,
  /** 讨论课 */
  Discuss = 4,
  /** 作业任务 */
  Work = 5
}

export const LessonTypeLabels: Record<LessonType, string> = {
  [LessonType.Video]: "录播视频",
  [LessonType.Text]: "图文课",
  [LessonType.Live]: "直播课",
  [LessonType.Discuss]: "讨论课",
  [LessonType.Work]: "作业任务"
}

export const LessonTypeIcons: Record<LessonType, string> = {
  [LessonType.Video]: lessonVideoImg,
  [LessonType.Text]: lessonTextImg,
  [LessonType.Live]: lessonLiveImg,
  [LessonType.Discuss]: lessonDiscussImg,
  [LessonType.Work]: lessonWorkImg
}
