<script lang="ts" setup>
import { reactive, ref } from "vue"

const props = defineProps({
  meta: {
    default() {
      return {}
    },
    type: Object
  }
})

const options = reactive([
  { key: "menu-home", label: "menu-home" },
  { key: "menu-class", label: "menu-class" },
  { key: "menu-course", label: "menu-course" },
  { key: "menu-member", label: "menu-member" },
  { key: "menu-organization", label: "menu-organization" },
  { key: "menu-document", label: "menu-document" },
  { key: "menu-feedback", label: "menu-feedback" },
  { key: "menu-community", label: "menu-community" },
  { key: "menu-notification", label: "menu-notification" },
  { key: "menu-settings", label: "menu-settings" },
  { key: "dashboard", label: "dashboard" },
  { key: "setting", label: "setting" },
  { key: "lock", label: "lock" },
  { key: "menu", label: "menu" },
  { key: "bug", label: "bug" },
  { key: "network", label: "network" },
  { key: "plus", label: "plus" },
  { key: "load", label: "load" },
  { key: "config", label: "config" },
  { key: "link", label: "link" },
  { key: "access", label: "access" },
  { key: "file", label: "file" },
  { key: "monitor", label: "monitor" }
])

const metaData = ref(props.meta)

function getValidIconName(label: string) {
  const validNames = [
    "menu-home",
    "menu-class",
    "menu-course",
    "menu-member",
    "menu-organization",
    "menu-document",
    "menu-feedback",
    "menu-community",
    "menu-notification",
    "menu-settings",
    "search",
    "link",
    "load",
    "access",
    "bug",
    "config",
    "dashboard",
    "file",
    "fullscreen-exit",
    "fullscreen",
    "keyboard-down",
    "keyboard-enter",
    "keyboard-esc",
    "keyboard-up",
    "lock",
    "menu",
    "monitor",
    "network",
    "plus",
    "radar",
    "setting"
  ]
  return validNames.includes(label) ? label : "setting" // fallback
}

// function iconForOption(option: typeof options[0]) {
//   return computed(() => getValidIconName(option.label))
// }

function iconForOption(option: typeof options[0]) {
  return computed(() => getValidIconName(option.label) as "menu-home" | "menu-class" | "menu-course" | "menu-member" | "menu-organization" | "menu-document" | "menu-feedback" | "menu-community" | "menu-notification" | "menu-settings" | "access" | "bug" | "config" | "dashboard" | "file" | "fullscreen-exit" | "fullscreen" | "keyboard-down" | "keyboard-enter" | "keyboard-esc" | "keyboard-up" | "link" | "load" | "lock" | "menu" | "monitor" | "network" | "plus" | "search" | "setting")
}
</script>

<template>
  <div>
    <el-select
      v-model="metaData.icon"
      class="td27-select"
      style="width: 100%"
      clearable
      filterable
      placeholder="请选择"
    >
      <template #prefix>
        <SvgIcon :name="metaData.icon" class="td27-icon" />
      </template>

      <el-option
        v-for="item in options"
        :key="item.key"
        class="select__option_item"
        :label="item.key"
        :value="item.key"
      >
        <span class="td27-icon" style="padding: 3px 0 0">
          <SvgIcon :name="iconForOption(item).value" />
        </span>
        <span>{{ item.key }}</span>
      </el-option>
    </el-select>
  </div>
</template>

<style>
.td27-icon {
  color: rgb(132, 146, 166);
  font-size: 14px;
  margin-right: 10px;
}

.select__option_item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}
</style>
