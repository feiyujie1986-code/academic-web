<script lang="ts" setup>
import DOMPurify from "dompurify"
import { computed, ref, watch } from "vue"

const props = withDefaults(defineProps<{ content?: string, title?: string, buttonText?: string }>(), {
  buttonText: "查看课节内容",
  title: "课节内容"
})

// CSS 样式白名单，只允许安全的样式属性
const ALLOWED_CSS_PROPERTIES = [
  "color",
  "background-color",
  "font-size",
  "font-weight",
  "font-style",
  "text-align",
  "text-decoration",
  "line-height",
  "margin",
  "padding",
  "border",
  "width",
  "height",
  "max-width",
  "max-height"
]

// 净化 CSS 样式，移除危险属性
function sanitizeStyle(style: string): string {
  if (!style) return ""
  const sanitized = style.split(";")
    .map(s => s.trim())
    .filter((s) => {
      const prop = s.split(":")[0]?.trim().toLowerCase()
      return prop && ALLOWED_CSS_PROPERTIES.includes(prop)
    })
    .join("; ")
  return sanitized
}

// 配置 DOMPurify 钩子，净化 style 属性
DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
  if (data.attrName === "style") {
    data.attrValue = sanitizeStyle(data.attrValue)
  }
})

// 使用 DOMPurify 净化 HTML 内容，防止 XSS 攻击
const sanitizedContent = computed(() => {
  if (!props.content) return ""
  return DOMPurify.sanitize(props.content, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "pre", "code", "img", "a", "span", "div", "table", "thead", "tbody", "tr", "th", "td", "hr", "sub", "sup"],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "width", "height", "style", "class", "target", "rel"],
    ALLOW_DATA_ATTR: false
  })
})

const visible = ref(false)
const loading = ref(false)
const imagesReady = ref(false)

function open() {
  visible.value = true
  imagesReady.value = false
  preloadImages()
}

function close() {
  visible.value = false
}

// 预加载所有图片
async function preloadImages() {
  if (!props.content) {
    imagesReady.value = true
    return
  }

  // 从 HTML 内容中提取所有图片 URL
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi
  const urls: string[] = []
  const matches = props.content.matchAll(imgRegex)
  for (const match of matches) {
    urls.push(match[1])
  }

  // 如果没有图片，直接显示内容
  if (urls.length === 0) {
    imagesReady.value = true
    return
  }

  loading.value = true

  // 预加载所有图片
  const loadImage = (url: string): Promise<void> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = () => resolve() // 加载失败也继续
      img.src = url
    })
  }

  try {
    await Promise.all(urls.map(loadImage))
  } finally {
    loading.value = false
    imagesReady.value = true
  }
}

// 监听内容变化，重新预加载
watch(() => props.content, () => {
  if (visible.value) {
    imagesReady.value = false
    preloadImages()
  }
})
</script>

<template>
  <div>
    <el-link type="primary" underline="never" size="mini" @click="open">
      <span style="font-size: 12px; line-height: 22px;">{{ props.buttonText }}</span>
    </el-link>

    <el-dialog v-model="visible" :title="props.title" :width="860" :height="455">
      <!-- 加载中状态 -->
      <div v-if="loading" class="loading-wrapper">
        <el-icon class="loading-icon">
          <Loading />
        </el-icon>
        <span class="loading-text">图片加载中...</span>
      </div>

      <!-- 内容区域：使用 DOMPurify 净化后的内容 -->
      <div v-show="imagesReady" class="rich-content" v-html="sanitizedContent" />

      <template #footer>
        <el-button @click="close">
          关闭
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #909399;
}

.loading-icon {
  font-size: 32px;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

.loading-text {
  font-size: 14px;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.rich-content {
  max-height: 60vh;
  overflow: auto;
  padding: 16px;
}

/* 默认图片自适应容器宽度 */
.rich-content :deep(img) {
  max-width: 100%;
  height: auto;
}

/* 有 width 属性的图片，保持原始设定尺寸 */
.rich-content :deep(img[width]),
.rich-content :deep(img[style*="width"]) {
  max-width: none !important;
}
</style>
