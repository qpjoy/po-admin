<template>
  <div class="statistics-dashboard">
    <a-page-header title="统计面板" subtitle="查看客户端更新和使用情况统计">
      <template #extra>
        <a-space>
          <a-select
            v-model="selectedProvider"
            placeholder="选择供应商"
            style="width: 200px"
            @change="loadStatistics"
          >
            <a-option v-for="provider in providers" :key="provider.id" :value="provider.id">
              {{ provider.name }}
            </a-option>
          </a-select>
          <a-button @click="loadStatistics" :loading="loading">
            <template #icon><icon-refresh /></template>
            刷新
          </a-button>
        </a-space>
      </template>
    </a-page-header>

    <!-- Summary Cards -->
    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic title="总客户端数" :value="totalClients" :value-style="{ color: '#0fbf60' }">
            <template #prefix>
              <icon-desktop />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic title="最新版本" :value="latestVersion" :value-style="{ color: '#165dff' }">
            <template #prefix>
              <icon-rocket />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic title="活跃隧道数" :value="activeTunnels" :value-style="{ color: '#ff7d00' }">
            <template #prefix>
              <icon-link />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic
            title="更新覆盖率"
            :value="updateCoverage"
            suffix="%"
            :value-style="{ color: '#722ed1' }"
          >
            <template #prefix>
              <icon-check-circle />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <!-- Version Distribution Chart -->
    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :span="12">
        <a-card title="版本分布" :bordered="false">
          <a-table :data="versionDistribution" :pagination="false" :bordered="{ wrapper: true, cell: true }">
            <template #columns>
              <a-table-column title="版本" data-index="version" :width="150" />
              <a-table-column title="客户端数量" :width="120">
                <template #cell="{ record }">
                  <a-tag color="blue">{{ record.count }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column title="占比">
                <template #cell="{ record }">
                  <a-progress :percent="record.percentage" :stroke-width="8" :show-text="true" />
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-card>
      </a-col>

      <a-col :span="12">
        <a-card title="最近更新记录" :bordered="false">
          <a-timeline>
            <a-timeline-item v-for="(record, index) in recentUpdates" :key="index">
              <template #dot>
                <icon-check-circle-fill :style="{ color: '#0fbf60', fontSize: '16px' }" />
              </template>
              <div class="timeline-content">
                <div class="timeline-title">版本 {{ record.version }} 发布</div>
                <div class="timeline-desc">
                  {{ record.description }}
                </div>
                <div class="timeline-time">
                  {{ formatDate(record.createdAt) }}
                </div>
              </div>
            </a-timeline-item>
          </a-timeline>
        </a-card>
      </a-col>
    </a-row>

    <!-- Client Details Table -->
    <a-card title="客户端详情" :bordered="false" style="margin-top: 16px">
      <a-table
        :data="clientStats"
        :loading="loading"
        :pagination="{ pageSize: 10 }"
        :bordered="{ wrapper: true, cell: true }"
      >
        <template #columns>
          <a-table-column title="供应商ID" data-index="providerId" :width="120" />
          <a-table-column title="密钥ID" data-index="keyId" :width="120" />
          <a-table-column title="当前版本" :width="120">
            <template #cell="{ record }">
              <a-tag :color="record.currentVersion === latestVersion ? 'green' : 'orange'">
                {{ record.currentVersion }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="最后检查更新" :width="180">
            <template #cell="{ record }">
              {{ formatDate(record.lastCheckUpdate) }}
            </template>
          </a-table-column>
          <a-table-column title="隧道状态">
            <template #cell="{ record }">
              <a-space wrap>
                <a-tag
                  v-for="tunnel in record.tunnelStatuses"
                  :key="tunnel.tunnelId"
                  :color="getTunnelStatusColor(tunnel.status)"
                  size="small"
                >
                  {{ tunnel.tunnelId }}: {{ tunnel.status }}
                  <span v-if="tunnel.uptime > 0"> ({{ formatUptime(tunnel.uptime) }}) </span>
                </a-tag>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Message } from '@arco-design/web-vue';
import {
  IconRefresh,
  IconDesktop,
  IconLink,
  IconCheckCircle,
  IconCheckCircleFill
} from '@arco-design/web-vue/es/icon';
import { statsApi, providerApi, releaseApi } from '@/api';
import type { Provider, ClientStats, VersionDistribution, Release } from '@/types';

const loading = ref(false);
const providers = ref<Provider[]>([]);
const selectedProvider = ref('');
const versionDistribution = ref<VersionDistribution[]>([]);
const clientStats = ref<ClientStats[]>([]);
const recentUpdates = ref<Release[]>([]);

const totalClients = computed(() => clientStats.value.length);
const latestVersion = ref('0.0.0');
const activeTunnels = computed(() => {
  let count = 0;
  clientStats.value.forEach((client) => {
    client.tunnelStatuses?.forEach((tunnel) => {
      if (tunnel.status === 'connected') count++;
    });
  });
  return count;
});

const updateCoverage = computed(() => {
  if (totalClients.value === 0) return 0;
  const upToDateClients = clientStats.value.filter((c) => c.currentVersion === latestVersion.value).length;
  return Math.round((upToDateClients / totalClients.value) * 100);
});

const getTunnelStatusColor = (status: string) => {
  switch (status) {
    case 'connected':
      return 'green';
    case 'connecting':
      return 'blue';
    case 'disconnected':
      return 'gray';
    case 'error':
      return 'red';
    default:
      return 'gray';
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN');
};

const formatUptime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}天`;
  } else if (hours > 0) {
    return `${hours}小时`;
  } else {
    return `${minutes}分钟`;
  }
};

const loadProviders = async () => {
  try {
    const response = await providerApi.list();
    // Backend returns { success: true, data: [...] }
    providers.value = (response.data as any).data || response.data;
    if (providers.value.length > 0 && !selectedProvider.value) {
      selectedProvider.value = providers.value[0].id;
      loadStatistics();
    }
  } catch (error) {
    console.error('加载供应商列表失败:', error);
  }
};

const loadStatistics = async () => {
  if (!selectedProvider.value) return;

  loading.value = true;
  try {
    // Load version distribution
    const versionResponse = await statsApi.getVersionDistribution(selectedProvider.value);
    versionDistribution.value = (versionResponse.data as any).data || versionResponse.data || [];

    // Load client stats
    const clientResponse = await statsApi.getClientStats(selectedProvider.value);
    clientStats.value = (clientResponse.data as any).data || clientResponse.data || [];

    // Load recent updates
    const releasesResponse = await releaseApi.list(selectedProvider.value);
    const releases = (releasesResponse.data as any).data || releasesResponse.data;
    recentUpdates.value = (releases || []).slice(0, 5);

    // Get latest version
    const latestResponse = await releaseApi.getLatest(selectedProvider.value);
    const latestData = (latestResponse.data as any).data || latestResponse.data;
    latestVersion.value = latestData?.version || '0.0.0';
  } catch (error) {
    console.error('加载统计数据失败:', error);
    Message.error('加载统计数据失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadProviders();
});
</script>

<style scoped>
.statistics-dashboard {
  width: 100%;
}

.timeline-content {
  padding-left: 8px;
}

.timeline-title {
  font-weight: 600;
  color: var(--color-text-1);
  margin-bottom: 4px;
}

.timeline-desc {
  font-size: 14px;
  color: var(--color-text-2);
  margin-bottom: 4px;
}

.timeline-time {
  font-size: 12px;
  color: var(--color-text-3);
}

:deep(.arco-statistic-value) {
  font-size: 28px;
  font-weight: 600;
}

:deep(.arco-statistic-title) {
  font-size: 14px;
  color: var(--color-text-3);
  margin-bottom: 8px;
}
</style>
