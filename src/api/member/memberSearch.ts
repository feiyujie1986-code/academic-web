import { request } from "@/http/axios_n"

export interface MemberSearchItem {
  id: number
  email: string
  nickname: string
  active: boolean
  userType: number
  organizationId: number
  organizationName: string
  createdAt: number
  updatedAt: number
}

interface ReqMemberSearch extends PageInfo {
  nickname: string
}

export function searchMembersApi(params: ReqMemberSearch) {
  return request<ApiResponseData<ListData<MemberSearchItem[]>>>({
    url: "/v2/admin/members/search",
    method: "get",
    params
  })
}
