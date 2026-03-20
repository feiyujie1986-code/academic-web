<script lang="ts" setup>
import type { RouteLocationMatched } from "vue-router"
import { useRouteListener } from "@@/composables/useRouteListener"
import { compile } from "path-to-regexp"

const route = useRoute()

const router = useRouter()

const { listenerRouteChange } = useRouteListener()

/** 定义响应式数据 breadcrumbs，用于存储面包屑导航信息 */
const breadcrumbs = ref<RouteLocationMatched[]>([])

/** 是否显示面包屑 */
const showBreadcrumb = ref(true)

/** 获取面包屑导航信息 */
function getBreadcrumb() {
  const lastMatched = route.matched[route.matched.length - 1]
  // 如果路由配置了 breadcrumb: false，则不显示面包屑
  if (lastMatched.meta.breadcrumb === false) {
    showBreadcrumb.value = false
    breadcrumbs.value = []
    return
  }
  showBreadcrumb.value = true
  const readcrumbsData = []
  if (lastMatched.meta.level === 2) {
    const parentName = lastMatched.meta.parent
    // 通过 parentName 查找对应的父路由配置
    const parentRoute = router.getRoutes().find(r => r.name === parentName)
    if (parentRoute) {
      readcrumbsData.push(parentRoute)
    }
  }
  readcrumbsData.push(lastMatched)
  breadcrumbs.value = readcrumbsData
}

/** 编译路由路径 */
function pathCompile(path: string) {
  const toPath = compile(path)
  return toPath(route.params)
}

/** 处理面包屑导航点击事件 */
function handleLink(item: RouteLocationMatched) {
  const { redirect, path } = item
  if (redirect) return router.push(redirect as string)
  router.push(pathCompile(path))
}

// 监听路由变化，更新面包屑导航信息
listenerRouteChange((route) => {
  if (route.path.startsWith("/redirect/")) return
  getBreadcrumb()
}, true)
</script>

<template>
  <div v-if="showBreadcrumb" class="breadcrumb-container">
    <el-breadcrumb>
      <el-breadcrumb-item v-for="(item, index) in breadcrumbs" :key="item.path">
        <span v-if="item.redirect === 'noRedirect' || index === breadcrumbs.length - 1" class="no-redirect">
          {{ item.meta.title }}
        </span>
        <a v-else @click.prevent="handleLink(item)">
          {{ item.meta.title }}
        </a>
      </el-breadcrumb-item>
    </el-breadcrumb>
  </div>
</template>

<style lang="scss" scoped>
.breadcrumb-container {
  margin: 8px 8px 0;
}
.el-breadcrumb {
  line-height: var(--v3-navigationbar-height);
  .no-redirect {
    color: var(--el-text-color-placeholder);
  }
  a {
    font-weight: normal;
  }
}
</style>
