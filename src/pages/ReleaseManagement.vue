<template>
  <div class="release-management">
    <a-page-header title="发布管理" subtitle="管理版本发布和更新策略">
      <template #extra>
        <a-space>
          <a-select
            v-model="selectedProvider"
            placeholder="选择供应商"
            style="width: 200px;"
            @change="loadReleases"
          >
            <a-option value="">全部供应商</a-option>
            <a-option
              v-for="provider in providers"
              :key="provider.id"
              :value="provider.id"
            >
              {{ provider.name }}
            </a-option>
          </a-select>
          <a-button type="primary" @click="$router.push('/releases/create')">
            <template #icon><icon-plus /></template>
            创建发布
          </a-button>
        </a-space>
      </template>
    </a-page-header>

    <a-card :bordered="false" style="margin-top: 16px;">
      <a-table
        :data="releases"
        :loading="loading"
        :pagination="{ pageSize: 20 }"
        :bordered="{ wrapper: true, cell: true }"
      >
        <template #columns>
          <a-table-column title="版本" data-index="version" :width="100" />
          <a-table-column title="供应商" :width="120">
            <template #cell="{ record }">
              <a-tag color="blue">{{ record.providerId }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="描述" data-index="description" />
          <a-table-column title="更新策略" :width="120">
            <template #cell="{ record }">
              <a-tag :color="getStrategyColor(record.strategy?.type)">
                {{ getStrategyLabel(record.strategy?.type) }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="目标角色" :width="150">
            <template #cell="{ record }">
              <a-space wrap>
                <a-tag
                  v-for="role in (record.target?.roles || [])"
                  :key="role"
                  size="small"
                >
                  {{ role === '*' ? '全部' : role }}
                </a-tag>
              </a-space>
            </template>
          </a-table-column>
          <a-table-column title="更新字段" :width="200">
            <template #cell="{ record }">
              <a-space wrap>
                <a-tag
                  v-if="record.fields?.tunnels"
                  color="green"
                  size="small"
                >
                  Tunnels
                </a-tag>
                <a-tag
                  v-if="record.fields?.routing"
                  color="blue"
                  size="small"
                >
                  Routing
                </a-tag>
                <a-tag
                  v-if="record.fields?.sshKeys"
                  color="orange"
                  size="small"
                >
                  SSH Keys
                </a-tag>
                <a-tag
                  v-if="record.fields?.tokens"
                  color="purple"
                  size="small"
                >
                  Tokens
                </a-tag>
              </a-space>
            </template>
          </a-table-column>
          <a-table-column title="创建时间" :width="180">
            <template #cell="{ record }">
              {{ formatDate(record.createdAt) }}
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="120" fixed="right">
            <template #cell="{ record }">
              <a-space>
                <a-button
                  type="text"
                  size="small"
                  @click="viewRelease(record)"
                >
                  <template #icon><icon-eye /></template>
                  详情
                </a-button>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- Rollback Section -->
    <a-card title="版本回滚" :bordered="false" style="margin-top: 16px;">
      <a-alert type="warning" style="margin-bottom: 16px;">
        回滚操作将恢复到上一个版本，此操作不可撤销。
      </a-alert>
      <a-form layout="inline">
        <a-form-item label="选择供应商">
          <a-select
            v-model="rollbackProviderId"
            placeholder="选择供应商"
            style="width: 200px;"
          >
            <a-option
              v-for="provider in providers"
              :key="provider.id"
              :value="provider.id"
            >
              {{ provider.name }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-popconfirm
            content="确定要回滚到上一个版本吗？"
            @ok="handleRollback"
          >
            <a-button type="primary" status="warning">
              <template #icon><icon-undo /></template>
              执行回滚
            </a-button>
          </a-popconfirm>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- View Release Modal -->
    <a-modal
      v-model:visible="showDetailDialog"
      title="发布详情"
      :footer="false"
      width="800px"
    >
      <div v-if="selectedRelease">
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="版本">
            {{ selectedRelease.version }}
          </a-descriptions-item>
          <a-descriptions-item label="供应商">
            {{ selectedRelease.providerId }}
          </a-descriptions-item>
          <a-descriptions-item label="描述" :span="2">
            {{ selectedRelease.description }}
          </a-descriptions-item>
          <a-descriptions-item label="更新策略">
            <a-tag :color="getStrategyColor(selectedRelease.strategy?.type)">
              {{ getStrategyLabel(selectedRelease.strategy?.type) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="强制更新">
            {{ selectedRelease.strategy?.forceUpdate ? '是' : '否' }}
          </a-descriptions-item>
          <a-descriptions-item label="强制重启">
            {{ selectedRelease.strategy?.forceRestart ? '是' : '否' }}
          </a-descriptions-item>
          <a-descriptions-item label="仅通知">
            {{ selectedRelease.strategy?.notifyOnly ? '是' : '否' }}
          </a-descriptions-item>
          <a-descriptions-item label="目标角色" :span="2">
            {{ (selectedRelease.target?.roles || []).join(', ') }}
          </a-descriptions-item>
          <a-descriptions-item label="创建时间" :span="2">
            {{ formatDate(selectedRelease.createdAt) }}
          </a-descriptions-item>
        </a-descriptions>

        <a-divider>更新字段详情</a-divider>

        <a-collapse :default-active-key="['1']">
          <a-collapse-item
            v-if="selectedRelease.fields?.tunnels"
            key="1"
            header="Tunnels 配置"
          >
            <pre>{{ JSON.stringify(selectedRelease.fields?.tunnels, null, 2) }}</pre>
          </a-collapse-item>
          <a-collapse-item
            v-if="selectedRelease.fields?.routing"
            key="2"
            header="Routing 配置"
          >
            <pre>{{ JSON.stringify(selectedRelease.fields?.routing, null, 2) }}</pre>
          </a-collapse-item>
          <a-collapse-item
            v-if="selectedRelease.fields?.sshKeys"
            key="3"
            header="SSH Keys 配置"
          >
            <pre>{{ JSON.stringify(selectedRelease.fields?.sshKeys, null, 2) }}</pre>
          </a-collapse-item>
          <a-collapse-item
            v-if="selectedRelease.fields?.tokens"
            key="4"
            header="Tokens 配置"
          >
            <pre>{{ JSON.stringify(selectedRelease.fields?.tokens, null, 2) }}</pre>
          </a-collapse-item>
        </a-collapse>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Message } from '@arco-design/web-vue';
import {
  IconPlus,
  IconEye,
  IconUndo,
} from '@arco-design/web-vue/es/icon';
import { releaseApi, providerApi } from '@/api';
import type { Release, Provider } from '@/types';

const loading = ref(false);
const releases = ref<Release[]>([]);
const providers = ref<Provider[]>([]);
const selectedProvider = ref('');
const rollbackProviderId = ref('');
const showDetailDialog = ref(false);
const selectedRelease = ref<Release | null>(null);

const getStrategyColor = (type: string) => {
  switch (type) {
    case 'graceful':
      return 'blue';
    case 'immediate':
      return 'orange';
    default:
      return 'gray';
  }
};

const getStrategyLabel = (type: string) => {
  switch (type) {
    case 'graceful':
      return '友好更新';
    case 'immediate':
      return '立即更新';
    default:
      return type;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN');
};

const loadProviders = async () => {
  try {
    const response = await providerApi.list();
    // Backend returns { success: true, data: [...] }
    providers.value = response.data.data || response.data;
  } catch (error) {
    console.error('加载供应商列表失败:', error);
  }
};

const loadReleases = async () => {
  loading.value = true;
  try {
    const response = await releaseApi.list(selectedProvider.value || undefined);
    // Backend returns { success: true, data: [...] }
    releases.value = response.data.data || response.data;
  } catch (error) {
    console.error('加载发布列表失败:', error);
    Message.error('加载发布列表失败');
  } finally {
    loading.value = false;
  }
};

const viewRelease = (release: Release) => {
  selectedRelease.value = release;
  showDetailDialog.value = true;
};

const handleRollback = async () => {
  if (!rollbackProviderId.value) {
    Message.error('请选择供应商');
    return;
  }

  try {
    await releaseApi.rollback(rollbackProviderId.value);
    Message.success('版本已回滚');
    loadReleases();
  } catch (error: any) {
    console.error('回滚失败:', error);
    Message.error(error.response?.data?.error || '回滚失败');
  }
};

onMounted(() => {
  loadProviders();
  loadReleases();
});
</script>

<style scoped>
.release-management {
  width: 100%;
}

pre {
  background: var(--color-fill-2);
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: monospace;
  font-size: 12px;
}
</style>
