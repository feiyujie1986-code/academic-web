import "axios"

declare module "axios" {
  interface AxiosRequestConfig {
    /**
     * 静默模式配置
     * - true: 所有错误都静默
     * - "timeout": 仅超时错误静默
     */
    silent?: boolean | "timeout"
    /**
     * 当前重试次数（内部使用）
     */
    __retryCount?: number
  }
}
