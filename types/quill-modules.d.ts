declare module "quill-blot-formatter" {
  import type Quill from "quill"

  export interface BlotFormatterOptions {
    specs?: any[]
    overlay?: {
      className?: string
      style?: Record<string, string>
    }
    align?: {
      attribute?: string
      aligner?: {
        applyStyle?: boolean
      }
    }
    resize?: {
      handleClassName?: string
      handleStyle?: Record<string, string>
    }
  }

  export default class BlotFormatter {
    constructor(quill: Quill, options?: BlotFormatterOptions)
  }
}
