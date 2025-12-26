<template>
  <div class="create-release">
    <a-page-header
      title="创建发布"
      subtitle="创建新版本发布并配置更新字段"
      @back="$router.back()"
    />

    <a-card :bordered="false" style="margin-top: 16px;">
      <a-form :model="releaseForm" layout="vertical">
        <!-- Basic Info -->
        <a-divider orientation="left">基本信息</a-divider>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="供应商" required>
              <a-select
                v-model="releaseForm.providerId"
                placeholder="选择供应商"
                @change="loadProviderData"
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
          </a-col>
          <a-col :span="12">
            <a-form-item label="版本号" required>
              <a-input
                v-model="releaseForm.version"
                placeholder="例如: 0.0.4"
              />
              <div class="form-tip">
                当前最新版本: {{ currentVersion || '未知' }}
              </div>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="发布描述" required>
          <a-textarea
            v-model="releaseForm.description"
            placeholder="描述本次更新的内容"
            :max-length="500"
            show-word-limit
          />
        </a-form-item>

        <!-- Update Strategy -->
        <a-divider orientation="left">更新策略</a-divider>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="策略类型" required>
              <a-select v-model="releaseForm.strategy.type">
                <a-option value="graceful">友好更新 (询问用户)</a-option>
                <a-option value="immediate">立即更新 (自动应用)</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="目标角色" required>
              <a-select
                v-model="releaseForm.target.roles"
                multiple
                placeholder="选择目标角色"
              >
                <a-option value="*">全部</a-option>
                <a-option value="leader">leader</a-option>
                <a-option value="employee">employee</a-option>
                <a-option value="common">common</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="强制更新">
              <a-switch v-model="releaseForm.strategy.forceUpdate" />
              <div class="form-tip">用户无法跳过此更新</div>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="强制重启">
              <a-switch v-model="releaseForm.strategy.forceRestart" />
              <div class="form-tip">更新后强制重启应用</div>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="仅通知">
              <a-switch v-model="releaseForm.strategy.notifyOnly" />
              <div class="form-tip">仅发送通知，不更新配置</div>
            </a-form-item>
          </a-col>
        </a-row>

        <!-- Field Updates -->
        <a-divider orientation="left">更新字段</a-divider>

        <a-space direction="vertical" fill style="width: 100%;">
          <!-- Tunnels Update -->
          <a-card
            title="Tunnels 配置更新"
            :bordered="true"
            size="small"
          >
            <template #extra>
              <a-switch v-model="updateTunnels" />
            </template>

            <div v-if="updateTunnels">
              <a-form-item label="操作类型">
                <a-select v-model="tunnelUpdate.action">
                  <a-option value="add">添加隧道</a-option>
                  <a-option value="modify">修改隧道</a-option>
                  <a-option value="remove">删除隧道</a-option>
                </a-select>
              </a-form-item>

              <a-form-item label="隧道ID">
                <a-input v-model="tunnelUpdate.tunnelId" placeholder="例如: vpn" />
              </a-form-item>

              <div v-if="tunnelUpdate.action !== 'remove'">
                <a-form-item label="隧道配置 (JSON)">
                  <a-textarea
                    v-model="tunnelConfigJson"
                    placeholder='{"id": "vpn", "name": "VPN Tunnel", "enabled": true, "ssh": {"host": "23.225.161.60", "port": 22, "username": "wuxi"}, "localPort": 1082}'
                    :auto-size="{ minRows: 4, maxRows: 10 }"
                  />
                </a-form-item>
              </div>

              <a-form-item label="需要重启">
                <a-switch v-model="tunnelUpdate.requiresRestart" />
              </a-form-item>
            </div>
          </a-card>

          <!-- Routing Update -->
          <a-card
            title="Routing 配置更新"
            :bordered="true"
            size="small"
          >
            <template #extra>
              <a-switch v-model="updateRouting" />
            </template>

            <div v-if="updateRouting">
              <a-form-item label="操作类型">
                <a-select v-model="routingUpdate.action">
                  <a-option value="add">添加路由规则</a-option>
                  <a-option value="modify">修改路由规则</a-option>
                  <a-option value="remove">删除路由规则</a-option>
                </a-select>
              </a-form-item>

              <a-form-item label="规则ID" v-if="routingUpdate.action !== 'add'">
                <a-input v-model="routingUpdate.ruleId" placeholder="例如: rule-001" />
              </a-form-item>

              <div v-if="routingUpdate.action !== 'remove'">
                <a-form-item label="路由配置 (JSON)">
                  <a-textarea
                    v-model="routingConfigJson"
                    placeholder='{"defaultTunnel": "international", "rules": [...]}'
                    :auto-size="{ minRows: 4, maxRows: 10 }"
                  />
                </a-form-item>
              </div>

              <a-form-item label="需要重启">
                <a-switch v-model="routingUpdate.requiresRestart" />
              </a-form-item>
            </div>
          </a-card>

          <!-- SSH Keys Update -->
          <a-card
            title="SSH Keys 配置更新"
            :bordered="true"
            size="small"
          >
            <template #extra>
              <a-switch v-model="updateSSHKeys" />
            </template>

            <div v-if="updateSSHKeys">
              <a-form-item label="操作类型">
                <a-select v-model="sshKeyUpdate.action">
                  <a-option value="add">添加密钥</a-option>
                  <a-option value="modify">修改密钥</a-option>
                  <a-option value="remove">删除密钥</a-option>
                </a-select>
              </a-form-item>

              <a-form-item label="密钥ID">
                <a-input v-model="sshKeyUpdate.keyId" placeholder="例如: leader" />
              </a-form-item>

              <div v-if="sshKeyUpdate.action !== 'remove'">
                <a-form-item label="密钥配置 (JSON)">
                  <a-textarea
                    v-model="sshKeyConfigJson"
                    placeholder='{"keyId": "leader", "role": "leader", "publicKey": "ssh-rsa AAAA...", "privateKey": "-----BEGIN OPENSSH PRIVATE KEY-----..."}'
                    :auto-size="{ minRows: 4, maxRows: 10 }"
                  />
                </a-form-item>
              </div>

              <a-form-item label="需要重启">
                <a-switch v-model="sshKeyUpdate.requiresRestart" />
              </a-form-item>
            </div>
          </a-card>

          <!-- Custom Configuration -->
          <a-card
            title="自定义配置 (Custom Config)"
            :bordered="true"
            size="small"
          >
            <template #extra>
              <a-switch v-model="updateCustomConfig" />
            </template>

            <div v-if="updateCustomConfig">
              <a-form-item>
                <template #label>
                  <span>配置数据 (JSON格式)</span>
                  <a-tooltip content="可以添加任意key-value对，如tokens、aiTokens等。客户端将在更新时获取这些配置。">
                    <icon-question-circle style="margin-left: 4px; color: var(--color-text-3);" />
                  </a-tooltip>
                </template>
                <a-textarea
                  v-model="customConfigJson"
                  placeholder='{"token": "your-token-value", "aiToken": "sk-xxx", "apiEndpoint": "https://api.example.com", "customKey": "customValue"}'
                  :auto-size="{ minRows: 6, maxRows: 15 }"
                />
                <div class="form-tip">
                  提示: 这些配置会被合并到客户端的config中，可以通过config.token、config.aiToken等方式访问
                </div>
              </a-form-item>

              <a-form-item label="需要重启">
                <a-switch v-model="customConfigUpdate.requiresRestart" />
              </a-form-item>
            </div>
          </a-card>
        </a-space>

        <!-- Submit Actions -->
        <a-divider />

        <a-space>
          <a-button type="primary" size="large" @click="handleSubmit">
            <template #icon><icon-check /></template>
            创建发布
          </a-button>
          <a-button size="large" @click="$router.back()">
            取消
          </a-button>
        </a-space>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Message } from '@arco-design/web-vue';
import { IconCheck, IconQuestionCircle } from '@arco-design/web-vue/es/icon';
import { releaseApi, providerApi } from '@/api';
import type { Provider, ReleaseFields } from '@/types';

const router = useRouter();
const providers = ref<Provider[]>([]);
const currentVersion = ref('');

const releaseForm = ref({
  version: '',
  providerId: '',
  description: '',
  strategy: {
    type: 'graceful' as 'graceful' | 'immediate',
    forceUpdate: false,
    forceRestart: false,
    notifyOnly: false,
  },
  target: {
    roles: ['*'],
  },
});

const updateTunnels = ref(false);
const updateRouting = ref(false);
const updateSSHKeys = ref(false);
const updateCustomConfig = ref(false);

const tunnelUpdate = ref({
  action: 'add' as 'add' | 'modify' | 'remove',
  tunnelId: '',
  requiresRestart: false,
});
const tunnelConfigJson = ref('');

const routingUpdate = ref({
  action: 'add' as 'add' | 'modify' | 'remove',
  ruleId: '',
  requiresRestart: false,
});
const routingConfigJson = ref('');

const sshKeyUpdate = ref({
  action: 'add' as 'add' | 'modify' | 'remove',
  keyId: '',
  requiresRestart: false,
});
const sshKeyConfigJson = ref('');

const customConfigUpdate = ref({
  requiresRestart: false,
});
const customConfigJson = ref('');

const loadProviders = async () => {
  try {
    const response = await providerApi.list();
    // Backend returns { success: true, data: [...] }
    providers.value = (response.data as any).data || response.data;
  } catch (error) {
    console.error('加载供应商列表失败:', error);
  }
};

const loadProviderData = async () => {
  if (!releaseForm.value.providerId) return;

  try {
    const response = await releaseApi.getLatest(releaseForm.value.providerId);
    // Backend returns { success: true, data: { version: "..." } }
    const latestData = (response.data as any).data || response.data;
    currentVersion.value = latestData?.version || '0.0.0';
  } catch (error) {
    console.error('加载当前版本失败:', error);
    currentVersion.value = '0.0.0';
  }
};

const handleSubmit = async () => {
  // Validation
  if (!releaseForm.value.providerId || !releaseForm.value.version || !releaseForm.value.description) {
    Message.error('请填写所有必填项');
    return;
  }

  if (releaseForm.value.target.roles.length === 0) {
    Message.error('请选择至少一个目标角色');
    return;
  }

  if (!updateTunnels.value && !updateRouting.value && !updateSSHKeys.value && !updateCustomConfig.value) {
    Message.error('请至少选择一个要更新的字段');
    return;
  }

  // Build fields object
  const fields: ReleaseFields = {};

  try {
    if (updateTunnels.value) {
      fields.tunnels = {
        action: tunnelUpdate.value.action,
        tunnelId: tunnelUpdate.value.tunnelId,
        requiresRestart: tunnelUpdate.value.requiresRestart,
      };

      if (tunnelUpdate.value.action !== 'remove' && tunnelConfigJson.value) {
        fields.tunnels.config = JSON.parse(tunnelConfigJson.value);
      }
    }

    if (updateRouting.value) {
      fields.routing = {
        action: routingUpdate.value.action,
        ruleId: routingUpdate.value.ruleId,
        requiresRestart: routingUpdate.value.requiresRestart,
      };

      if (routingUpdate.value.action !== 'remove' && routingConfigJson.value) {
        fields.routing.config = JSON.parse(routingConfigJson.value);
      }
    }

    if (updateSSHKeys.value) {
      fields.sshKeys = {
        action: sshKeyUpdate.value.action,
        keyId: sshKeyUpdate.value.keyId,
        requiresRestart: sshKeyUpdate.value.requiresRestart,
      };

      if (sshKeyUpdate.value.action !== 'remove' && sshKeyConfigJson.value) {
        fields.sshKeys.config = JSON.parse(sshKeyConfigJson.value);
      }
    }

    if (updateCustomConfig.value) {
      // Custom config is a flexible key-value object that will be merged into client config
      const customConfig = customConfigJson.value ? JSON.parse(customConfigJson.value) : {};
      (fields as any).customConfig = {
        config: customConfig,
        requiresRestart: customConfigUpdate.value.requiresRestart,
      };
    }
  } catch (error) {
    console.error('解析JSON配置失败:', error);
    Message.error('JSON配置格式错误，请检查后重试');
    return;
  }

  // Create release
  try {
    await releaseApi.create({
      version: releaseForm.value.version,
      providerId: releaseForm.value.providerId,
      description: releaseForm.value.description,
      strategy: releaseForm.value.strategy,
      target: releaseForm.value.target,
      fields,
    });

    Message.success('发布创建成功');
    router.push('/releases');
  } catch (error: any) {
    console.error('创建发布失败:', error);
    Message.error(error.response?.data?.error || '创建发布失败');
  }
};

onMounted(() => {
  loadProviders();
});
</script>

<style scoped>
.create-release {
  width: 100%;
}

.form-tip {
  font-size: 12px;
  color: var(--color-text-3);
  margin-top: 4px;
}

:deep(.arco-card-body) {
  padding: 16px;
}
</style>
