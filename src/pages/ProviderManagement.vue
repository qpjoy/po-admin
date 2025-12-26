<template>
  <div class="provider-management">
    <a-page-header title="供应商管理" subtitle="管理SSH代理供应商和密钥">
      <template #extra>
        <a-button type="primary" @click="showCreateDialog = true">
          <template #icon><icon-plus /></template>
          添加供应商
        </a-button>
      </template>
    </a-page-header>

    <a-card :bordered="false" style="margin-top: 16px">
      <a-table
        :data="providers"
        :loading="loading"
        :pagination="{ pageSize: 10 }"
        :bordered="{ wrapper: true, cell: true }"
      >
        <template #columns>
          <a-table-column title="供应商ID" data-index="id" :width="120" />
          <a-table-column title="名称" data-index="name" :width="150" />
          <a-table-column title="描述" data-index="description" />
          <a-table-column title="SSH密钥数量" :width="120">
            <template #cell="{ record }">
              <a-tag color="blue">{{ record.sshKeys?.length || 0 }} 个</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="创建时间" :width="180">
            <template #cell="{ record }">
              {{ formatDate(record.createdAt) }}
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="200" fixed="right">
            <template #cell="{ record }">
              <a-space>
                <a-button type="text" size="small" @click="goToKeys(record.id)">
                  <template #icon><icon-key /></template>
                  管理密钥
                </a-button>
                <a-button type="text" size="small" @click="editProvider(record)">
                  <template #icon><icon-edit /></template>
                </a-button>
                <a-popconfirm
                  content="确定要删除此供应商吗？这将删除所有相关的SSH密钥。"
                  @ok="deleteProvider(record.id)"
                >
                  <a-button type="text" status="danger" size="small">
                    <template #icon><icon-delete /></template>
                  </a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Provider Modal -->
    <a-modal
      v-model:visible="showCreateDialog"
      :title="editingProvider ? '编辑供应商' : '创建新供应商'"
      @ok="handleSubmit"
      @cancel="resetForm"
      width="650px"
    >
      <a-alert v-if="!editingProvider" type="info" style="margin-bottom: 16px;" closable>
        <template #icon>
          <icon-info-circle />
        </template>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">🚀 创建供应商后将自动：</div>
          <ol style="margin: 4px 0 0 16px; padding-left: 0;">
            <li>在服务器上创建 <strong>nologin</strong> 用户: <code>/home/{{ providerForm.id || '{供应商ID}' }}</code></li>
            <li>自动生成并注入 <strong>leader</strong> 角色的 SSH 公钥到 <code>~/.ssh/authorized_keys</code></li>
            <li>私钥存储在数据库中，可在"SSH密钥管理"页面查看和下载</li>
          </ol>
        </div>
      </a-alert>

      <a-form :model="providerForm" layout="vertical">
        <a-form-item label="供应商ID" required>
          <a-input
            v-model="providerForm.id"
            placeholder="例如: wuxi, zhoushan"
            :disabled="!!editingProvider"
          />
          <div class="form-tip">
            <icon-info-circle style="margin-right: 4px;" />
            仅允许小写字母、数字和连字符，将作为服务器用户名: <code>/home/{{ providerForm.id || '{id}' }}</code>
          </div>
        </a-form-item>

        <a-form-item label="供应商名称" required>
          <a-input v-model="providerForm.name" placeholder="例如: 无锡团队, 舟山分公司" />
        </a-form-item>

        <a-form-item label="描述">
          <a-textarea
            v-model="providerForm.description"
            placeholder="可选：添加供应商的描述信息"
            :max-length="200"
            show-word-limit
            :auto-size="{ minRows: 2, maxRows: 4 }"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Message } from '@arco-design/web-vue';
import { IconPlus, IconEdit, IconDelete, IconInfoCircle } from '@arco-design/web-vue/es/icon';
import { providerApi } from '@/api';
import type { Provider } from '@/types';

const router = useRouter();
const loading = ref(false);
const providers = ref<Provider[]>([]);
const showCreateDialog = ref(false);
const editingProvider = ref<Provider | null>(null);

const providerForm = ref({
  id: '',
  name: '',
  description: ''
});

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN');
};

const loadProviders = async () => {
  loading.value = true;
  try {
    const response = await providerApi.list();
    // Backend returns { success: true, data: [...] }
    providers.value = response.data.data || response.data;
  } catch (error) {
    console.error('加载供应商列表失败:', error);
    Message.error('加载供应商列表失败');
  } finally {
    loading.value = false;
  }
};

const editProvider = (provider: Provider) => {
  editingProvider.value = provider;
  providerForm.value = {
    id: provider.id,
    name: provider.name,
    description: provider.description || ''
  };
  showCreateDialog.value = true;
};

const handleSubmit = async () => {
  if (!providerForm.value.id || !providerForm.value.name) {
    Message.error('请填写所有必填项');
    return;
  }

  try {
    if (editingProvider.value) {
      await providerApi.update(editingProvider.value.id, {
        name: providerForm.value.name,
        description: providerForm.value.description
      });
      Message.success('供应商已更新');
    } else {
      await providerApi.create({
        id: providerForm.value.id,
        name: providerForm.value.name,
        description: providerForm.value.description
      });
      Message.success('供应商已添加');
    }
    showCreateDialog.value = false;
    resetForm();
    loadProviders();
  } catch (error: any) {
    console.error('保存供应商失败:', error);
    Message.error(error.response?.data?.error || '保存供应商失败');
  }
};

const deleteProvider = async (providerId: string) => {
  try {
    await providerApi.delete(providerId);
    Message.success('供应商已删除');
    loadProviders();
  } catch (error: any) {
    console.error('删除供应商失败:', error);
    Message.error(error.response?.data?.error || '删除供应商失败');
  }
};

const resetForm = () => {
  providerForm.value = {
    id: '',
    name: '',
    description: ''
  };
  editingProvider.value = null;
};

const goToKeys = (providerId: string) => {
  router.push({ name: 'ssh-keys', params: { id: providerId } });
};

onMounted(() => {
  loadProviders();
});
</script>

<style scoped>
.provider-management {
  width: 100%;
}

.form-tip {
  font-size: 12px;
  color: var(--color-text-3);
  margin-top: 4px;
}
</style>
