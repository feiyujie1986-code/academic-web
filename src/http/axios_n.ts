import type { AxiosInstance, AxiosRequestConfig } from "axios"
import axios from "axios"
import { get, merge } from "lodash-es"
import { useUserStore } from "@/pinia/stores/user_n"

/** 最大重试次数 */
const MAX_RETRY_COUNT = 3

/** 退出登录并强制刷新页面（会重定向到登录页） */
function logout() {
  useUserStore().logout()
  location.reload()
}

/** 判断是否为超时错误 */
function isTimeoutError(error: any): boolean {
  return error.code === "ECONNABORTED" || error.message?.includes("timeout")
}

/** 判断是否应该静默处理错误 */
function shouldSilent(config: AxiosRequestConfig | undefined, isTimeout = false): boolean {
  const silent = config?.silent
  if (silent === true) return true
  if (silent === "timeout" && isTimeout) return true
  return false
}

/** 显示超时友好弹窗，返回用户是否选择重试 */
async function showTimeoutDialog(): Promise<boolean> {
  try {
    await ElMessageBox.confirm(
      "请求响应时间过长，请检查您的网络设置后重试。",
      "网络有点开小差",
      {
        confirmButtonText: "重新连接",
        cancelButtonText: "取消",
        type: "warning"
      }
    )
    return true
  } catch {
    return false
  }
}

/** 用于请求的实例 */
let instance: AxiosInstance

/** 创建请求实例 */
function createInstance() {
  // 创建一个 axios 实例命名为 instance
  const axiosInstance = axios.create()
  // 请求拦截器
  axiosInstance.interceptors.request.use(
    // 发送之前
    config => config,
    // 发送失败
    error => Promise.reject(error)
  )
  // 响应拦截器（可根据具体业务作出相应的调整）
  axiosInstance.interceptors.response.use(
    (response) => {
      // apiData 是 api 返回的数据
      const apiData = response.data
      // 二进制数据则直接返回
      const responseType = response.config.responseType
      if (responseType === "blob" || responseType === "arraybuffer") return apiData
      // 这个 code 是和后端约定的业务 code
      const code = apiData.code
      // 如果没有 code, 代表这不是项目后端开发的 api
      if (code === undefined) {
        if (!shouldSilent(response.config)) {
          ElMessage.error("非本系统的接口")
        }
        return Promise.reject(new Error("非本系统的接口"))
      }
      switch (code) {
        case 0:
          // 本系统采用 code === 0 来表示没有业务错误
          return apiData

        default:
          // 不是正确的 code
          if (apiData.data && apiData.data.reload) {
            useUserStore().logout()
          }

          if (!shouldSilent(response.config)) {
            ElMessage.error(apiData.msg || "Error")
          }
          return Promise.reject(apiData.msg || "Error")
      }
    },
    async (error) => {
      // status 是 HTTP 状态码
      const status = get(error, "response.status")
      const message = get(error, "response.data.message")
      const config: AxiosRequestConfig | undefined = get(error, "config")
      const isTimeout = isTimeoutError(error)

      // 超时自动重试逻辑
      if (isTimeout && config) {
        const retryCount = config.__retryCount || 0

        // 未达到最大重试次数，自动重试
        if (retryCount < MAX_RETRY_COUNT) {
          config.__retryCount = retryCount + 1
          return instance(config)
        }

        // 达到最大重试次数
        // 如果是静默模式，直接返回错误
        if (shouldSilent(config, true)) {
          return Promise.reject(error)
        }

        // 显示友好弹窗
        const shouldRetry = await showTimeoutDialog()
        if (shouldRetry) {
          // 用户选择重新连接，重置重试计数并重新请求
          config.__retryCount = 0
          return instance(config)
        }

        // 用户选择取消
        return Promise.reject(error)
      }

      switch (status) {
        case 400:
          error.message = "请求错误"
          break
        case 401:
          // Token 过期时
          error.message = message || "未授权"
          logout()
          return Promise.reject(error)
        case 403:
          error.message = message || "拒绝访问"
          break
        case 404:
          error.message = "请求地址出错"
          break
        case 408:
          error.message = "请求超时"
          break
        case 500:
          error.message = "服务器内部错误"
          break
        case 501:
          error.message = "服务未实现"
          break
        case 502:
          error.message = "网关错误"
          break
        case 503:
          error.message = "服务不可用"
          break
        case 504:
          error.message = "网关超时"
          break
        case 505:
          error.message = "HTTP 版本不受支持"
          break
        default:
          if (isTimeout) {
            error.message = "请求超时"
          } else if (!status && error.message === "Network Error") {
            // 网络完全断开的情况
            error.message = "网络有点开小差"
          }
      }

      if (!shouldSilent(config, isTimeout)) {
        ElMessage.error(error.message)
      }
      return Promise.reject(error)
    }
  )
  return axiosInstance
}

/** 创建请求方法 */
function createRequest(axiosInstance: AxiosInstance) {
  return <T>(config: AxiosRequestConfig): Promise<T> => {
    // 默认配置
    const defaultConfig: AxiosRequestConfig = {
      // 接口地址
      baseURL: import.meta.env.VITE_BASE_URL,
      // 请求头
      headers: {
        // 携带 Token
        "x-token": useUserStore().token,
        "Content-Type": "application/json"
      },
      // 请求体
      data: {},
      // 请求超时
      timeout: 5000,
      // 跨域请求时是否携带 Cookies
      withCredentials: false
    }
    // 将默认配置 defaultConfig 和传入的自定义配置 config 进行合并成为 mergeConfig
    const mergeConfig = merge(defaultConfig, config)
    return axiosInstance(mergeConfig)
  }
}

/** 初始化实例 */
instance = createInstance()

/** 用于请求的方法 */
export const request = createRequest(instance)
