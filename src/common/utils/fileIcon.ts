import fileCsvIcon from "@@/assets/images/file-csv-icon.png"
import fileExcelIcon from "@@/assets/images/file-excel-icon.png"
import fileFileIcon from "@@/assets/images/file-file-icon.png"
import fileGifIcon from "@@/assets/images/file-gif-icon.png"
import fileImgIcon from "@@/assets/images/file-img-icon.png"
import fileMp3Icon from "@@/assets/images/file-mp3-icon.png"
import fileMp4Icon from "@@/assets/images/file-mp4-icon.png"
import filePdfIcon from "@@/assets/images/file-pdf-icon.png"
import filePptIcon from "@@/assets/images/file-ppt-icon.png"
import fileSvgIcon from "@@/assets/images/file-svg-icon.png"
import fileTextIcon from "@@/assets/images/file-text-icon.png"
import fileWordIcon from "@@/assets/images/file-word-icon.png"
import fileZipIcon from "@@/assets/images/file-zip-icon.png"

export function getFilePngIcon(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  if (["xls", "xlsx"].includes(ext)) return fileExcelIcon
  if (ext === "csv") return fileCsvIcon
  if (["doc", "docx"].includes(ext)) return fileWordIcon
  if (["ppt", "pptx"].includes(ext)) return filePptIcon
  if (ext === "pdf") return filePdfIcon
  if (["txt", "rtf"].includes(ext)) return fileTextIcon
  if (["mp3", "wav", "m4a"].includes(ext)) return fileMp3Icon
  if (["mp4", "avi", "mov", "mkv", "flv", "wmv", "webm", "m4v"].includes(ext)) return fileMp4Icon
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return fileZipIcon
  if (ext === "gif") return fileGifIcon
  if (ext === "svg") return fileSvgIcon
  if (["jpg", "jpeg", "png", "webp", "bmp"].includes(ext)) return fileImgIcon
  return fileFileIcon
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}
