<script lang="ts" setup>
import { useUserStore } from "@/pinia/stores/user_n"
import Admin from "./components/Admin.vue"
import Editor from "./components/Editor.vue"

const userStore = useUserStore()

// 判断是否是管理员 判断条件 是否包含超级管理员角色
const isAdmin = userStore.userInfo.roles?.some(item => item.identity === "super_admin")
</script>

<template>
  <component :is="isAdmin ? Admin : Editor" />
</template>
