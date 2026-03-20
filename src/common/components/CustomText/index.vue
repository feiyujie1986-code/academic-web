<script lang="ts" setup>
import type { CSSProperties } from "vue"
import DOMPurify from "dompurify"
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue"

interface Props {
  content: string
  lineClamp?: number
  // tooltip 内折叠行数，0 表示不折叠
  tooltipLineClamp?: number
  // tooltip 最大宽度
  maxWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  lineClamp: 1,
  tooltipLineClamp: 0,
  maxWidth: 600
})

const textRef = ref<HTMLElement | null>(null)
const tooltipContentRef = ref<HTMLElement | null>(null)
const isOverflow = ref(false)
const isTooltipOverflow = ref(false)
const expanded = ref(false)

const lineClampStyle = computed<CSSProperties>(() => ({
  display: "-webkit-box",
  WebkitLineClamp: props.lineClamp,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
  wordBreak: "break-all"
}))

// tooltip 内容折叠样式
const tooltipContentStyle = computed<CSSProperties>(() => {
  if (props.tooltipLineClamp <= 0 || expanded.value) {
    return { wordBreak: "break-all" }
  }
  return {
    display: "-webkit-box",
    WebkitLineClamp: props.tooltipLineClamp,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    textOverflow: "ellipsis",
    wordBreak: "break-all"
  }
})

function checkOverflow() {
  if (textRef.value) {
    isOverflow.value = textRef.value.scrollHeight > textRef.value.clientHeight
  }
}

// 检测 tooltip 内容是否溢出
function checkTooltipOverflow() {
  if (tooltipContentRef.value && props.tooltipLineClamp > 0) {
    isTooltipOverflow.value = tooltipContentRef.value.scrollHeight > tooltipContentRef.value.clientHeight
  }
}

// tooltip 显示时检测溢出
function handleTooltipShow() {
  nextTick(() => {
    checkTooltipOverflow()
  })
}

// tooltip 隐藏时重置状态
function handleTooltipHide() {
  expanded.value = false
  isTooltipOverflow.value = false
}

function toggleExpand() {
  expanded.value = !expanded.value
}

onMounted(() => {
  checkOverflow()
  window.addEventListener("resize", checkOverflow)
})

onUnmounted(() => {
  window.removeEventListener("resize", checkOverflow)
})

watch(() => props.content, () => {
  setTimeout(checkOverflow, 0)
})

// 使用 DOMPurify 净化 HTML 内容，防止 XSS 攻击
const sanitizedContent = computed(() => {
  if (!props.content) return ""
  return DOMPurify.sanitize(props.content, {
    ALLOWED_TAGS: ["br", "span", "strong", "em", "b", "i"],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false
  })
})
</script>

<template>
  <el-tooltip
    placement="top"
    :disabled="!isOverflow"
    effect="dark"
    @show="handleTooltipShow"
    @hide="handleTooltipHide"
  >
    <template #content>
      <div :style="{ maxWidth: `${maxWidth}px` }">
        <div ref="tooltipContentRef" :style="tooltipContentStyle" v-html="sanitizedContent" />
        <div
          v-if="tooltipLineClamp > 0 && isTooltipOverflow"
          class="custom-text-expand-btn"
          @click="toggleExpand"
        >
          {{ expanded ? "收起" : "展开全部" }}
        </div>
      </div>
    </template>
    <div ref="textRef" :style="lineClampStyle">
      {{ content }}
    </div>
  </el-tooltip>
</template>

<style scoped>
.custom-text-expand-btn {
  margin-top: 8px;
  color: #409eff;
  cursor: pointer;
  font-size: 12px;
}

.custom-text-expand-btn:hover {
  text-decoration: underline;
}
</style>
