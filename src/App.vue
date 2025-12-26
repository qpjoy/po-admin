<template>
  <a-layout class="admin-layout">
    <a-layout-header class="admin-header">
      <div class="header-left">
        <h1 class="brand-title">PO Proxy Admin</h1>
        <span class="brand-subtitle">代理管理后台</span>
      </div>
      <div class="header-right">
        <a-space>
          <a-tag color="blue">v1.0.0</a-tag>
          <a-avatar :size="32">
            <span>AD</span>
          </a-avatar>
        </a-space>
      </div>
    </a-layout-header>

    <a-layout>
      <a-layout-sider :width="200" class="admin-sider">
        <a-menu :selected-keys="selectedKeys" @menu-item-click="handleMenuClick" class="admin-menu">
          <a-menu-item key="/providers">
            <template #icon>
              <icon-apps />
            </template>
            供应商管理
          </a-menu-item>
          <a-menu-item key="/releases">
            <template #icon>
              <icon-send />
            </template>
            发布管理
          </a-menu-item>
          <!-- Statistics dashboard disabled - backend API not implemented yet -->
          <!-- <a-menu-item key="/statistics">
            <template #icon>
              <icon-bar-chart />
            </template>
            统计面板
          </a-menu-item> -->
        </a-menu>
      </a-layout-sider>

      <a-layout-content class="admin-content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { IconApps, IconSend } from '@arco-design/web-vue/es/icon';

const router = useRouter();
const route = useRoute();
const selectedKeys = ref(['/providers']);

const handleMenuClick = (key: string) => {
  selectedKeys.value = [key];
  router.push(key);
};

watch(
  () => route.path,
  (newPath) => {
    if (newPath.startsWith('/providers')) {
      selectedKeys.value = ['/providers'];
    } else if (newPath.startsWith('/releases')) {
      selectedKeys.value = ['/releases'];
    } else if (newPath.startsWith('/statistics')) {
      selectedKeys.value = ['/statistics'];
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
}

.admin-header {
  background: var(--color-bg-2);
  border-bottom: 1px solid var(--color-border-2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 60px;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.brand-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-1);
}

.brand-subtitle {
  font-size: 14px;
  color: var(--color-text-3);
}

.header-right {
  display: flex;
  align-items: center;
}

.admin-sider {
  background: var(--color-bg-1);
  border-right: 1px solid var(--color-border-2);
}

.admin-menu {
  padding-top: 16px;
}

.admin-content {
  padding: 24px;
  background: var(--color-bg-1);
  min-height: calc(100vh - 60px);
}
</style>
