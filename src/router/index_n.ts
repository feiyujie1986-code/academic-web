import type { RouteRecordRaw } from "vue-router"
import { createRouter } from "vue-router"
import { routerConfig } from "@/router/config"
import { registerNavigationGuard } from "@/router/guard_n"
import { flatMultiLevelRoutes } from "./helper"

const Layouts = () => import("@/layouts/index.vue")

/**
 * @name 常驻路由
 * @description 除了 redirect/403/404/login 等隐藏页面，其他页面建议设置唯一的 Name 属性
 */
export const constantRoutes: RouteRecordRaw[] = [
  {
    path: "/redirect",
    component: Layouts,
    meta: {
      hidden: true
    },
    children: [
      {
        path: ":path(.*)",
        component: () => import("@/pages/redirect/index.vue")
      }
    ]
  },
  {
    path: "/403",
    component: () => import("@/pages/error/403.vue"),
    meta: {
      hidden: true
    }
  },
  {
    path: "/404",
    component: () => import("@/pages/error/404.vue"),
    meta: {
      hidden: true
    },
    alias: "/:pathMatch(.*)*"
  },
  {
    path: "/login",
    component: () => import("@/pages/login/index.vue"),
    meta: {
      hidden: true
    }
  },
  {
    path: "/",
    component: Layouts,
    redirect: "/dashboard",
    children: [
      {
        path: "dashboard",
        component: () => import("@/pages/dashboard/index.vue"),
        name: "Dashboard",
        meta: {
          title: "首页",
          svgIcon: "dashboard",
          affix: true
        }
      }
    ]
  },
  {
    path: "/profile",
    component: Layouts,
    meta: { hidden: true },
    redirect: "/profile/index",
    children: [
      {
        path: "index",
        component: () => import("@/pages/profile/index.vue"),
        name: "Profile",
        meta: {
          title: "个人中心"
        }
      }
    ]
  },
  {
    path: "/course/detail",
    component: Layouts,
    meta: { hidden: true },
    redirect: "/course/detail/:id",
    children: [
      {
        path: ":id",
        component: () => import("@/pages/course/detail/index.vue"),
        name: "CourseDetail",
        meta: {
          title: "课程详情",
          level: 2,
          parent: "CourseList"
        }
      }
    ]
  },
  {
    path: "/class/detail",
    component: Layouts,
    meta: { hidden: true },
    redirect: "/class/detail/:id",
    children: [
      {
        path: ":id",
        component: () => import("@/pages/class/detail/index.vue"),
        name: "ClassDetail",
        meta: {
          title: "班级详情",
          level: 2,
          parent: "ClassList"
        }
      }
    ]
  },
  {
    path: "/class/add",
    component: Layouts,
    meta: { hidden: true },
    redirect: "/class/add/index",
    children: [
      {
        path: "index",
        component: () => import("@/pages/class/add/index.vue"),
        name: "ClassAdd",
        meta: {
          title: "新增班级",
          level: 2,
          parent: "ClassList"
        }
      }
    ]
  },
  {
    path: "/course/add",
    component: Layouts,
    meta: { hidden: true },
    redirect: "/course/add/index",
    children: [
      {
        path: "index",
        component: () => import("@/pages/course/add/index.vue"),
        name: "CourseAdd",
        meta: {
          title: "新增模板",
          level: 2,
          parent: "CourseList"
        }
      }
    ]
  },
  {
    path: "/course/edit",
    component: Layouts,
    meta: { hidden: true },
    redirect: "/course/edit/:id",
    children: [
      {
        path: ":id",
        component: () => import("@/pages/course/edit/index.vue"),
        name: "CourseEdit",
        meta: {
          title: "编辑模板",
          level: 2,
          parent: "CourseList"
        }
      }
    ]
  },
  {
    path: "/feedback/detail",
    component: Layouts,
    meta: { hidden: true },
    redirect: "/feedback/detail/:id",
    children: [
      {
        path: ":id",
        component: () => import("@/pages/feedback/detail/index.vue"),
        name: "FeedbackDetail",
        meta: {
          title: "反馈详情",
          level: 2,
          parent: "FeedbackList"
        }
      }
    ]
  },
  {
    path: "/feedback/teachingDetail",
    component: Layouts,
    meta: { hidden: true },
    redirect: "/feedback/teachingDetail/:id",
    children: [
      {
        path: ":id",
        component: () => import("@/pages/feedback/teachingDetail/index.vue"),
        name: "TeachingFeedbackDetail",
        meta: {
          title: "教学反馈详情",
          level: 2,
          parent: "TeachingFeedbackList"
        }
      }
    ]
  },
  {
    path: "/community",
    component: Layouts,
    meta: { hidden: true },
    redirect: "/community/list",
    children: [
      {
        path: "list",
        component: () => import("@/pages/community/list/index.vue"),
        name: "CommunityList"
      },
      {
        path: "manage/:type",
        component: () => import("@/pages/community/manage/index.vue"),
        name: "CommunityManage",
        meta: {
          title: "社区管理",
          level: 2,
          parent: "CommunityList",
          breadcrumb: false
        }
      }
    ]
  },
  {
    path: "/community/note",
    component: Layouts,
    meta: { hidden: true },
    redirect: "/community/note/list",
    children: [
      {
        path: "list",
        component: () => import("@/pages/note/list/index.vue"),
        name: "NoteList",
        meta: {
          title: "笔记管理"
        }
      }
    ]
  },
  {
    path: "/banner",
    component: Layouts,
    meta: { hidden: true },
    redirect: "/banner/list",
    children: [
      {
        path: "list",
        component: () => import("@/pages/banner/list/index.vue"),
        name: "BannerList",
        meta: {
          title: "Banner 管理"
        }
      }
    ]
  },
  {
    path: "/chat",
    component: Layouts,
    meta: { hidden: true },
    redirect: "/chat/list",
    children: [
      {
        path: "list",
        component: () => import("@/pages/chat/list/index.vue"),
        name: "ChatList",
        meta: { title: "群组维护" }
      },
      {
        path: "detail/:id",
        component: () => import("@/pages/chat/detail/index.vue"),
        name: "ChatDetail",
        meta: {
          title: "群组详情",
          level: 2,
          parent: "ChatList"
        }
      }
    ]
  },
  {
    path: "/notice",
    component: Layouts,
    meta: { hidden: true },
    redirect: "/notice/list",
    children: [
      {
        path: "list",
        component: () => import("@/pages/notice/list/index.vue"),
        name: "NoticeList",
        meta: {
          title: "通知设置"
        }
      },
      {
        path: "add",
        component: () => import("@/pages/notice/add/index.vue"),
        name: "NoticeAdd",
        meta: {
          title: "新增通知",
          level: 2,
          parent: "NoticeList"
        }
      },
      {
        path: "edit/:id",
        component: () => import("@/pages/notice/edit/index.vue"),
        name: "NoticeEdit",
        meta: {
          title: "编辑通知",
          level: 2,
          parent: "NoticeList"
        }
      },
      {
        path: "detail/:id",
        component: () => import("@/pages/notice/detail/index.vue"),
        name: "NoticeDetail",
        meta: {
          title: "通知详情",
          level: 2,
          parent: "NoticeList"
        }
      }
    ]
  }
]

/** 路由实例 */
export const router = createRouter({
  history: routerConfig.history,
  routes: routerConfig.thirdLevelRouteCache ? flatMultiLevelRoutes(constantRoutes) : constantRoutes
})

// 注册路由导航守卫
registerNavigationGuard(router)
