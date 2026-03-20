<script lang="ts" setup>
import logoText1 from "@@/assets/images/layouts/logo-text-1.png?url"
import logoText2 from "@@/assets/images/layouts/logo-text-2.png?url"
import { useLayoutMode } from "@@/composables/useLayoutMode"

interface Props {
  collapse?: boolean
}

const { collapse = true } = defineProps<Props>()

const { isTop } = useLayoutMode()
</script>

<template>
  <div class="layout-logo-container" :class="{ 'collapse': collapse, 'layout-mode-top': isTop }">
    <transition name="layout-logo-fade">
      <router-link v-if="collapse" key="collapse" to="/">
        <img :src="logoText2" class="layout-logo">
      </router-link>
      <router-link v-else key="expand" to="/">
        <img :src="logoText1" class="layout-logo-text">
      </router-link>
    </transition>
  </div>
</template>

<style lang="scss" scoped>
.layout-logo-container {
  position: relative;
  width: 100%;
  height: var(--v3-header-height);
  line-height: var(--v3-header-height);
  text-align: left;
  padding-left: 20px;
  overflow: hidden;
  .layout-logo {
    display: none;
  }
  .layout-logo-text {
    vertical-align: middle;
    width: 99ppx;
    height: 24px;
  }
}

.layout-mode-top {
  height: var(--v3-navigationbar-height);
  line-height: var(--v3-navigationbar-height);
}

.collapse {
  .layout-logo {
    width: 24px;
    height: 24px;
    vertical-align: middle;
    display: inline-block;
  }
  .layout-logo-text {
    display: none;
  }
}
</style>
