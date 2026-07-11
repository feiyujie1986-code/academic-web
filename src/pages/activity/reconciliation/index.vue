<script lang="ts" setup>
import AlertRecipientTab from "../components/AlertRecipientTab.vue"
import ReconciliationDiffTab from "../components/ReconciliationDiffTab.vue"

defineOptions({ name: "ActivityReconciliation" })

const activeTab = ref("diffs")
</script>

<template>
  <div class="app-container">
    <el-card shadow="never">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="对账差异" name="diffs">
          <ReconciliationDiffTab />
        </el-tab-pane>
        <el-tab-pane label="告警收件人" name="recipients">
          <AlertRecipientTab />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>
