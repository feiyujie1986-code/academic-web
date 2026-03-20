<script lang="ts" setup>
import type { CommunityStatistics } from "@/api/im/community"
import communityBg from "@@/assets/images/back- community-list.png"
import subCommunityIcon from "@@/assets/images/sub-community-icon-new.png"
import { onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import {
  CommunityType,
  CommunityTypeDescriptions,
  CommunityTypeLabels,
  getCommunityStatisticsApi
} from "@/api/im/community"

const router = useRouter()

// 统计数据
const statistics = ref<CommunityStatistics | null>(null)
const loading = ref(false)

// 社区卡片配置
const communityCards = [
  {
    type: CommunityType.Training,
    key: "training" as const,
    color: "#409EFF", // 蓝色
    icon: "community-training"
  },
  {
    type: CommunityType.Cooperation,
    key: "cooperation" as const,
    color: "#B385DB", // 紫色
    icon: "community-cooperation"
  },
  {
    type: CommunityType.Employee,
    key: "employee" as const,
    color: "#67C23A", // 绿色
    icon: "community-employee"
  }
]

// 获取统计数据
async function fetchStatistics() {
  loading.value = true
  try {
    const res = await getCommunityStatisticsApi()
    if (res.code === 0 && res.data) {
      statistics.value = res.data
    }
  } catch (err) {
    console.error("获取社区统计数据失败", err)
  } finally {
    loading.value = false
  }
}

// 获取卡片统计数据
function getCardStats(key: "training" | "cooperation" | "employee") {
  if (!statistics.value) {
    return { communityCount: 0, uniqueMemberCount: 0, conversationCount: 0 }
  }
  return statistics.value[key]
}

// 跳转到社区管理页面
function navigateToCommunity(type: CommunityType) {
  router.push(`/community/manage/${type}`)
}

onMounted(() => {
  fetchStatistics()
})
</script>

<template>
  <div class="community-settings">
    <!-- 背景装饰图 -->
    <img :src="communityBg" alt="" class="bg-decoration">

    <!-- 页面头部 -->
    <div class="page-header">
      <h1 class="page-title">
        社区管理
      </h1>
      <p class="page-description">
        系统预设了三个固定社区，每个社区有不同的业务定位和数据隔离策略，点击下方卡片进入亚社区管理。
      </p>
    </div>

    <!-- 社区卡片列表 -->
    <div v-loading="loading" class="community-cards">
      <div
        v-for="card in communityCards"
        :key="card.type"
        class="community-card"
        @click="navigateToCommunity(card.type)"
      >
        <!-- 卡片头部 -->
        <div class="card-header">
          <div class="card-icon">
            <img :src="subCommunityIcon" alt="社区图标" class="icon-img">
          </div>
          <div class="card-title">
            <span class="title-text">{{ CommunityTypeLabels[card.type] }}</span>
            <el-icon class="title-arrow">
              <ArrowRight />
            </el-icon>
          </div>
          <p class="card-description">
            {{ CommunityTypeDescriptions[card.type] }}
          </p>
        </div>

        <!-- 分隔线 -->
        <div class="card-divider" />

        <!-- 统计数据 -->
        <div class="card-stats">
          <div class="stat-item">
            <span class="stat-value">{{ getCardStats(card.key).communityCount }}</span>
            <span class="stat-label">亚社区</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ getCardStats(card.key).uniqueMemberCount }}</span>
            <span class="stat-label">成员</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ getCardStats(card.key).conversationCount }}</span>
            <span class="stat-label">群组</span>
          </div>
        </div>

        <!-- 底部进度条 -->
        <div class="card-progress" :style="{ backgroundColor: card.color }" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.community-settings {
  position: relative;
  padding: 0;
  min-height: 100%;
  background-color: #f5f7fa;
}

.bg-decoration {
  position: absolute;
  top: 0;
  right: 120px;
  width: 152px;
  height: 140px;
  z-index: 1;
  pointer-events: none;
}

.page-header {
  position: relative;
  z-index: 0;
  margin-bottom: 32px;
  padding: 24px;
  background-color: #fff;
  border-radius: 8px;

  .page-title {
    margin: 0 0 12px;
    font-size: 20px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .page-description {
    margin: 0;
    font-size: 14px;
    color: var(--el-text-color-secondary);
    line-height: 1.6;
  }
}

.community-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.community-card {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .card-header {
    text-align: center;
    margin-bottom: 20px;
  }

  .card-icon {
    width: 100px;
    height: 100px;
    margin: 0 auto 20px;

    .icon-img {
      width: 100%;
      height: 100%;
      transform: scale(2);
    }
  }

  .card-title {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 12px;
    cursor: pointer;

    .title-text {
      font-size: 18px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    .title-arrow {
      font-size: 16px;
      color: var(--el-text-color-secondary);
    }
  }

  .card-description {
    margin: 0;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-divider {
    height: 1px;
    background: var(--el-border-color-lighter);
    margin: 0 -24px 20px;
  }

  .card-stats {
    display: flex;
    justify-content: space-around;
  }

  .stat-item {
    text-align: center;

    .stat-value {
      display: block;
      font-size: 28px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      line-height: 1.2;
    }

    .stat-label {
      display: block;
      font-size: 12px;
      color: var(--el-text-color-secondary);
      margin-top: 4px;
    }
  }

  .card-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 4px;
  }
}

// 响应式布局
@media (max-width: 1200px) {
  .community-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .community-cards {
    grid-template-columns: 1fr;
  }
}
</style>
