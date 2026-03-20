import type * as ElementPlusIconsVue from "@element-plus/icons-vue"
import type { SvgName } from "~virtual/svg-component"
import { request } from "@/http/axios_n"

type ElementPlusIconsName = keyof typeof ElementPlusIconsVue

export interface MenuData {
  pid: number
  name: string
  path: string
  redirect?: string
  component: string
  sort: number
  meta: {
    hidden?: boolean
    title?: string
    elIcon?: ElementPlusIconsName
    svgIcon?: SvgName
    affix?: boolean
    keepAlive?: boolean
    alwaysShow?: boolean
  }
  children?: MenuData[]
}

export interface MenuDataModel extends MenuData, BaseModel {}

// List
// export type MenuListData = ListData<MenuDataModel[]>

// 获取动态路由
export function getMenus() {
  return request<ApiResponseData<MenuDataModel[]>>({
    url: "/v2/admin/menus/list",
    method: "post",
    data: {}
  })
}

export function addMenuApi(data: MenuData) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/menus",
    method: "post",
    data
  })
}

export function editMenuApi(data: MenuData & CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/menus",
    method: "put",
    data
  })
}

export function deleteMenuApi(data: CId) {
  return request<ApiResponseData<null>>({
    url: "/v2/admin/menus",
    method: "delete",
    data
  })
}

interface allMenus {
  list: MenuData[]
  menuIds: number[]
}

export function getElTreeMenusApi(data: CId) {
  return request<ApiResponseData<allMenus>>({
    url: "/v2/admin/menus/tree",
    method: "post",
    data
  })
}
