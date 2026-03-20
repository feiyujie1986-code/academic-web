import { request } from "@/http/axios_n"

export interface LoginRequestData {
  /** admin 或 editor */
  username: string
  /** 密码 */
  password: string
  /** 验证码 */
  captcha: string
  captchaId: string
}

type LoginCodeResponseData = ApiResponseData<{ picPath: string, captchaId: string }>
type LoginResponseData = ApiResponseData<{ token: string }>

// 获取验证码
export function captcha() {
  return request<LoginCodeResponseData>({
    url: "/v2/admin/auth/captcha",
    method: "post"
  })
}

/** 登录并返回 Token */
export function loginApi(data: LoginRequestData) {
  return request<LoginResponseData>({
    url: "/v2/admin/auth/login",
    method: "post",
    data,
    silent: true // 静默，由页面层处理错误提示
  })
}

// 登出
export function logoutApi() {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/auth/logout",
    method: "post",
    data: {},
    silent: true // 静默处理
  })
}
