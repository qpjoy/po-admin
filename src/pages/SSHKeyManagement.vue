<template>
  <div class="ssh-key-management">
    <a-page-header
      :title="`SSH密钥管理 - ${providerId}`"
      @back="$router.back()"
    >
      <template #subtitle>
        服务器路径: /home/{{ providerId }}/.ssh/authorized_keys
      </template>
      <template #extra>
        <a-button type="primary" @click="showGenerateDialog = true">
          <template #icon><icon-plus /></template>
          添加新密钥
        </a-button>
      </template>
    </a-page-header>

    <a-card :bordered="false" style="margin-top: 16px;">
      <a-alert
        type="info"
        style="margin-bottom: 16px;"
        closable
      >
        <template #icon>
          <icon-info-circle />
        </template>
        <div style="line-height: 1.6;">
          <div style="font-weight: 600; margin-bottom: 8px;">📌 工作原理：</div>
          <ul style="margin: 0 0 12px 20px; padding-left: 0;">
            <li style="margin-bottom: 6px;">
              <strong>创建供应商</strong> = 在服务器上创建 nologin 用户 <code>/home/{{ providerId }}</code>，并自动注入 <strong>leader</strong> 角色的公钥
            </li>
            <li style="margin-bottom: 6px;">
              <strong>密钥管理</strong> = 管理服务器 <code>/home/{{ providerId }}/.ssh/authorized_keys</code> 文件中的密钥
            </li>
            <li>
              <strong>客户端使用</strong> = Electron 客户端的 <code>.env</code> 文件中的 <code>SSH_KEY_ID</code> 对应这里的<strong>密钥ID</strong>
            </li>
          </ul>
          <div style="font-weight: 600; margin-bottom: 8px;">🔑 角色说明：</div>
          <ul style="margin: 0 0 0 20px; padding-left: 0;">
            <li><strong>leader</strong> (领导): 拥有最高优先级，用于领导/VIP用户</li>
            <li><strong>employee</strong> (员工): 普通员工用户</li>
            <li><strong>common</strong> (通用): 当客户端的 SSH_KEY_ID 不匹配时使用的备用密钥</li>
          </ul>
        </div>
      </a-alert>

      <a-table
        :data="sshKeys"
        :loading="loading"
        :pagination="false"
        :bordered="{ wrapper: true, cell: true }"
      >
        <template #columns>
          <a-table-column title="密钥ID" data-index="id" :width="150" />
          <a-table-column title="角色" :width="120">
            <template #cell="{ record }">
              <a-tag
                :color="getRoleColor(record.type)"
              >
                {{ getRoleLabel(record.type) }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="公钥指纹" :width="300">
            <template #cell="{ record }">
              <code class="key-fingerprint">{{ getFingerprint(record.publicKey) }}</code>
            </template>
          </a-table-column>
          <a-table-column title="创建时间" :width="180">
            <template #cell="{ record }">
              {{ formatDate(record.createdAt) }}
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="280" fixed="right">
            <template #cell="{ record }">
              <a-space>
                <a-button
                  type="text"
                  size="small"
                  @click="viewPublicKey(record)"
                >
                  <template #icon><icon-eye /></template>
                  查看公钥
                </a-button>
                <a-popconfirm
                  content="确定要重新生成此密钥吗？旧密钥将失效。"
                  @ok="rotateKey(record.id)"
                >
                  <a-button type="text" size="small">
                    <template #icon><icon-refresh /></template>
                    轮换
                  </a-button>
                </a-popconfirm>
                <a-popconfirm
                  content="确定要删除此密钥吗？使用此密钥的客户端将无法连接。"
                  @ok="deleteKey(record.id)"
                >
                  <a-button type="text" status="danger" size="small">
                    <template #icon><icon-delete /></template>
                    删除
                  </a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- Generate Key Modal -->
    <a-modal
      v-model:visible="showGenerateDialog"
      title="添加新SSH密钥"
      @ok="handleGenerateKey"
      @cancel="resetForm"
      width="650px"
    >
      <a-alert type="warning" style="margin-bottom: 16px;" closable>
        <template #icon>
          <icon-exclamation-circle />
        </template>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">⚠️ 操作说明</div>
          <ol style="margin: 4px 0 0 16px; padding-left: 0;">
            <li>系统将生成新的 SSH 密钥对（公钥 + 私钥）</li>
            <li>公钥将自动添加到服务器 <code>/home/{{ providerId }}/.ssh/authorized_keys</code></li>
            <li>私钥将存储在数据库中，供客户端下载使用</li>
          </ol>
        </div>
      </a-alert>

      <a-form :model="keyForm" layout="vertical">
        <a-form-item label="密钥ID" required>
          <a-input
            v-model="keyForm.keyId"
            placeholder="例如: employee001, employee002, common"
          />
          <div class="form-tip">
            <icon-info-circle style="margin-right: 4px;" />
            客户端在 <code>.env</code> 文件中配置: <code>SSH_KEY_ID={{ keyForm.keyId || 'your-key-id' }}</code>
          </div>
        </a-form-item>

        <a-form-item label="角色类型" required>
          <a-select v-model="keyForm.role" placeholder="选择角色">
            <a-option value="leader">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <a-tag color="red">leader</a-tag>
                  <span style="margin-left: 8px; font-weight: 600;">领导/VIP用户</span>
                </div>
                <span style="color: var(--color-text-3); font-size: 12px;">最高优先级</span>
              </div>
            </a-option>
            <a-option value="employee">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <a-tag color="blue">employee</a-tag>
                  <span style="margin-left: 8px; font-weight: 600;">普通员工</span>
                </div>
                <span style="color: var(--color-text-3); font-size: 12px;">标准访问权限</span>
              </div>
            </a-option>
            <a-option value="common">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <a-tag color="green">common</a-tag>
                  <span style="margin-left: 8px; font-weight: 600;">通用密钥</span>
                </div>
                <span style="color: var(--color-text-3); font-size: 12px;">备用/默认密钥</span>
              </div>
            </a-option>
          </a-select>
          <div class="form-tip">
            <icon-info-circle style="margin-right: 4px;" />
            <strong>common</strong> 密钥用作备用：当客户端的 SSH_KEY_ID 在服务器上找不到时，将自动使用 common 密钥
          </div>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- View Public Key Modal -->
    <a-modal
      v-model:visible="showPublicKeyDialog"
      title="SSH公钥"
      :footer="false"
      width="800px"
    >
      <div v-if="selectedKey">
        <a-descriptions :column="1" bordered>
          <a-descriptions-item label="密钥ID">
            {{ selectedKey.id }}
          </a-descriptions-item>
          <a-descriptions-item label="角色">
            <a-tag :color="getRoleColor(selectedKey.type)">
              {{ getRoleLabel(selectedKey.type) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="公钥内容">
            <a-textarea
              :model-value="selectedKey.publicKey"
              :auto-size="{ minRows: 3, maxRows: 6 }"
              readonly
            />
            <a-button
              type="primary"
              size="small"
              style="margin-top: 8px;"
              @click="copyToClipboard(selectedKey.publicKey)"
            >
              <template #icon><icon-copy /></template>
              复制到剪贴板
            </a-button>
          </a-descriptions-item>
        </a-descriptions>

        <a-alert type="warning" style="margin-top: 16px;">
          <strong>服务器部署步骤:</strong>
          <ol style="margin: 8px 0 0 20px;">
            <li>SSH登录到服务器: <code>ssh root@your-server</code></li>
            <li>切换到供应商用户: <code>su - {{ providerId }}</code></li>
            <li>编辑authorized_keys: <code>nano ~/.ssh/authorized_keys</code></li>
            <li>粘贴上面的公钥到文件末尾，保存退出</li>
            <li>设置权限: <code>chmod 600 ~/.ssh/authorized_keys</code></li>
          </ol>
        </a-alert>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { Message } from '@arco-design/web-vue';
import {
  IconPlus,
  IconEye,
  IconRefresh,
  IconDelete,
  IconCopy,
  IconInfoCircle,
  IconExclamationCircle,
} from '@arco-design/web-vue/es/icon';
import { sshKeyApi } from '@/api';
import type { SSHKey } from '@/types';

const route = useRoute();
const providerId = computed(() => route.params.id as string);

const loading = ref(false);
const sshKeys = ref<SSHKey[]>([]);
const showGenerateDialog = ref(false);
const showPublicKeyDialog = ref(false);
const selectedKey = ref<SSHKey | null>(null);

const keyForm = ref({
  keyId: '',
  role: 'employee' as 'leader' | 'employee' | 'common',
});

const getRoleColor = (role: string) => {
  switch (role) {
    case 'leader':
      return 'red';
    case 'employee':
      return 'blue';
    case 'common':
      return 'green';
    default:
      return 'gray';
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'leader':
      return 'leader (领导)';
    case 'employee':
      return 'employee (员工)';
    case 'common':
      return 'common (通用)';
    default:
      return role;
  }
};

const getFingerprint = (publicKey: string) => {
  // Extract key type and first/last few characters
  const parts = publicKey.split(' ');
  if (parts.length >= 2) {
    const keyData = parts[1];
    return `${parts[0]} ${keyData.substring(0, 16)}...${keyData.substring(keyData.length - 16)}`;
  }
  return publicKey.substring(0, 50) + '...';
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN');
};

const loadKeys = async () => {
  loading.value = true;
  try {
    const response = await sshKeyApi.list(providerId.value);
    // Backend returns { success: true, data: [...] }
    sshKeys.value = response.data.data || response.data;
  } catch (error) {
    console.error('加载SSH密钥列表失败:', error);
    Message.error('加载SSH密钥列表失败');
  } finally {
    loading.value = false;
  }
};

const handleGenerateKey = async () => {
  if (!keyForm.value.keyId || !keyForm.value.role) {
    Message.error('请填写所有必填项');
    return;
  }

  try {
    const response = await sshKeyApi.generate(
      providerId.value,
      keyForm.value.keyId,
      keyForm.value.role
    );
    Message.success('SSH密钥已生成');
    showGenerateDialog.value = false;
    resetForm();
    loadKeys();

    // Show the generated public key
    // Backend returns { success: true, data: {...} }
    selectedKey.value = response.data.data || response.data;
    showPublicKeyDialog.value = true;
  } catch (error: any) {
    console.error('生成SSH密钥失败:', error);
    Message.error(error.response?.data?.error || '生成SSH密钥失败');
  }
};

const viewPublicKey = async (key: SSHKey) => {
  selectedKey.value = key;
  showPublicKeyDialog.value = true;
};

const rotateKey = async (keyId: string) => {
  try {
    const response = await sshKeyApi.rotate(providerId.value, keyId);
    Message.success('SSH密钥已重新生成');
    loadKeys();

    // Show the new public key
    // Backend returns { success: true, data: {...} }
    selectedKey.value = response.data.data || response.data;
    showPublicKeyDialog.value = true;
  } catch (error: any) {
    console.error('轮换SSH密钥失败:', error);
    Message.error(error.response?.data?.error || '轮换SSH密钥失败');
  }
};

const deleteKey = async (keyId: string) => {
  try {
    await sshKeyApi.delete(providerId.value, keyId);
    Message.success('SSH密钥已删除');
    loadKeys();
  } catch (error: any) {
    console.error('删除SSH密钥失败:', error);
    Message.error(error.response?.data?.error || '删除SSH密钥失败');
  }
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    Message.success('已复制到剪贴板');
  } catch (error) {
    console.error('复制失败:', error);
    Message.error('复制失败，请手动复制');
  }
};

const resetForm = () => {
  keyForm.value = {
    keyId: '',
    role: 'employee',
  };
};

onMounted(() => {
  loadKeys();
});
</script>

<style scoped>
.ssh-key-management {
  width: 100%;
}

.form-tip {
  font-size: 12px;
  color: var(--color-text-3);
  margin-top: 4px;
}

.key-fingerprint {
  font-family: monospace;
  font-size: 12px;
  background: var(--color-fill-2);
  padding: 2px 6px;
  border-radius: 4px;
}

ul, ol {
  padding-left: 0;
}

code {
  background: var(--color-fill-2);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}
</style>
