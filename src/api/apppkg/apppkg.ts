import type { InitMultipartUploadReq, MultipartUploadInitRes } from "@/api/fileM/multipart"
import { request } from "@/http/axios_n"

// ==================== 常量定义 ====================

// 平台类型
export enum AppPackagePlatform {
  Android = 1,
  iOS = 2
}

// 平台中文映射
export const platformLabelMap: Record<number, string> = {
  [AppPackagePlatform.Android]: "Android",
  [AppPackagePlatform.iOS]: "iOS"
}

// 平台对应的安装包扩展名
export const platformExtMap: Record<number, string> = {
  [AppPackagePlatform.Android]: ".apk",
  [AppPackagePlatform.iOS]: ".ipa"
}

// 单包大小上限（500MB）
export const APP_PACKAGE_MAX_SIZE = 500 * 1024 * 1024

// ==================== 类型定义 ====================

// App 包列表项
export interface AppPackageItem extends BaseModel {
  platform: AppPackagePlatform
  versionName: string
  versionCode?: number
  changeLog?: string
  fileSize: number
  downloadUrl: string
  qrCodeUrl: string
  expiresAt: number
  downloadCount: number
  scope?: string
  createdBy: number
}

// App 包列表响应
export type AppPackageListData = ListData<AppPackageItem[]>

// 查询参数
export interface AppPackageQueryParams extends PageInfo {
  platform?: AppPackagePlatform
  scope?: string
}

// 新增参数
export interface AppPackageFormParams {
  platform: AppPackagePlatform
  versionName: string
  versionCode?: number
  changeLog?: string
  fileId: number
  scope?: string
}

// 上传初始化请求参数
export interface InitAppPackageUploadReq extends InitMultipartUploadReq {
  platform: AppPackagePlatform
}

// ==================== API 函数 ====================

/** 上传初始化：校验 500MB 限制，通过后透传 file 域 Multipart 分片上传初始化 */
export function initAppPackageUploadApi(data: InitAppPackageUploadReq) {
  return request<ApiResponseData<MultipartUploadInitRes>>({
    url: "/v2/admin/app-packages/uploads/init",
    method: "post",
    data,
    timeout: 30000,
    silent: true
  })
}

/** 获取 App 包列表 */
export function getAppPackageListApi(params: AppPackageQueryParams) {
  return request<ApiResponseData<AppPackageListData>>({
    url: "/v2/admin/app-packages",
    method: "get",
    params
  })
}

/** 创建 App 包记录 */
export function createAppPackageApi(data: AppPackageFormParams) {
  return request<ApiResponseData<AppPackageItem>>({
    url: "/v2/admin/app-packages",
    method: "post",
    data,
    timeout: 30000
  })
}

/** 删除 App 包 */
export function deleteAppPackageApi(id: number) {
  return request<ApiResponseData<null>>({
    url: `/v2/admin/app-packages/${id}`,
    method: "delete"
  })
}

/** 刷新下载令牌与二维码 */
export function refreshAppPackageQrCodeApi(id: number) {
  return request<ApiResponseData<AppPackageItem>>({
    url: `/v2/admin/app-packages/${id}/refresh-qrcode`,
    method: "post"
  })
}
