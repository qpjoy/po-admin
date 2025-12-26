<template>
  <div class="create-release-simple">
    <a-page-header
      title="创建发布"
      subtitle="创建新版本配置并发布到客户端"
      @back="$router.back()"
    />

    <a-card :bordered="false" style="margin-top: 16px;">
      <a-form :model="form" layout="vertical">
        <!-- Basic Info -->
        <a-divider orientation="left">基本信息</a-divider>

        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="供应商" required>
              <a-select
                v-model="form.providerId"
                placeholder="选择供应商"
                @change="loadProviderConfig"
              >
                <a-option
                  v-for="provider in providers"
                  :key="provider.id"
                  :value="provider.id"
                >
                  {{ provider.name }} ({{ provider.id }})
                </a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="版本号" required>
              <a-input
                v-model="form.version"
                placeholder="例如: 0.0.4"
                readonly
              />
              <div class="form-tip">
                当前版本: {{ currentVersion }} → 新版本: {{ form.version }}
              </div>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="目标角色" required>
              <a-select
                v-model="form.targetRoles"
                multiple
                placeholder="选择角色"
              >
                <a-option value="*">全部</a-option>
                <a-option value="leader">leader</a-option>
                <a-option value="employee">employee</a-option>
                <a-option value="common">common</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="发布描述" required>
          <a-textarea
            v-model="form.description"
            placeholder="描述本次更新的内容，例如：测试guangdong ssh"
            :max-length="500"
            show-word-limit
            :auto-size="{ minRows: 2, maxRows: 4 }"
          />
        </a-form-item>

        <!-- Tunnels Configuration -->
        <a-divider orientation="left">SSH 隧道配置</a-divider>

        <a-space direction="vertical" fill style="width: 100%;">
          <a-card
            v-for="(tunnel, index) in form.tunnels"
            :key="index"
            :bordered="true"
            size="small"
            style="margin-bottom: 12px;"
          >
            <template #title>
              <span>隧道 {{ index + 1 }}: {{ tunnel.id || '(未命名)' }}</span>
            </template>
            <template #extra>
              <a-button
                type="text"
                status="danger"
                @click="removeTunnel(index)"
              >
                删除
              </a-button>
            </template>

            <a-row :gutter="16">
              <a-col :span="8">
                <a-form-item label="隧道 ID" required>
                  <a-input v-model="tunnel.id" placeholder="例如: vpn, international" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="隧道名称" required>
                  <a-input v-model="tunnel.name" placeholder="例如: VPN 隧道" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="本地端口" required>
                  <a-input-number
                    v-model="tunnel.localPort"
                    placeholder="1080"
                    :min="1024"
                    :max="65535"
                    style="width: 100%;"
                  />
                </a-form-item>
              </a-col>
            </a-row>

            <a-divider orientation="left" style="margin: 12px 0;">SSH 连接配置</a-divider>

            <a-row :gutter="16">
              <a-col :span="8">
                <a-form-item label="SSH 主机" required>
                  <a-input v-model="tunnel.ssh.host" placeholder="23.225.161.60" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="SSH 端口" required>
                  <a-input-number
                    v-model="tunnel.ssh.port"
                    placeholder="22"
                    :min="1"
                    :max="65535"
                    style="width: 100%;"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="SSH 用户名" required>
                  <a-input
                    v-model="tunnel.ssh.username"
                    :placeholder="form.providerId || 'wuxi'"
                  />
                  <div class="form-tip">通常是供应商 ID</div>
                </a-form-item>
              </a-col>
            </a-row>

            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="状态">
                  <a-switch v-model="tunnel.enabled" />
                  <span style="margin-left: 8px;">{{ tunnel.enabled ? '启用' : '禁用' }}</span>
                </a-form-item>
              </a-col>
            </a-row>
          </a-card>
        </a-space>

        <a-button type="dashed" long @click="addTunnel">
          <template #icon><icon-plus /></template>
          添加隧道
        </a-button>

        <!-- Routing Configuration -->
        <a-divider orientation="left">路由配置</a-divider>

        <a-form-item label="默认隧道">
          <a-select v-model="form.routing.defaultTunnel" placeholder="选择默认隧道" allow-clear>
            <a-option
              v-for="tunnel in form.tunnels"
              :key="tunnel.id"
              :value="tunnel.id"
            >
              {{ tunnel.name }} ({{ tunnel.id }})
            </a-option>
          </a-select>
          <div class="form-tip">未匹配规则的流量将使用此隧道</div>
        </a-form-item>

        <a-form-item label="路由规则 (可选)">
          <a-textarea
            v-model="routingRulesJson"
            placeholder='[{"pattern": "*.google.com", "tunnel": "international"}]'
            :auto-size="{ minRows: 3, maxRows: 8 }"
          />
          <div class="form-tip">
            可选：JSON 数组格式的路由规则。留空则仅使用默认隧道。
          </div>
        </a-form-item>

        <!-- Custom Configuration -->
        <a-divider orientation="left">自定义配置 (可选)</a-divider>

        <a-form-item label="自定义键值对">
          <a-textarea
            v-model="customConfigJson"
            placeholder='{"token": "your-api-token", "aiToken": "sk-xxx", "apiEndpoint": "https://api.example.com"}'
            :auto-size="{ minRows: 4, maxRows: 10 }"
          />
          <div class="form-tip">
            可选：添加额外的配置，如 token、AI keys 等。客户端可通过 config.token 访问。
          </div>
        </a-form-item>

        <!-- Update Options -->
        <a-divider orientation="left">更新选项</a-divider>

        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="强制更新">
              <a-switch v-model="form.forceUpdate" />
              <div class="form-tip">用户无法跳过此更新</div>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="强制重启">
              <a-switch v-model="form.forceRestart" />
              <div class="form-tip">更新后强制重启应用</div>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="仅通知">
              <a-switch v-model="form.notifyOnly" />
              <div class="form-tip">仅发送通知，不更新配置</div>
            </a-form-item>
          </a-col>
        </a-row>

        <!-- Submit Actions -->
        <a-divider />

        <a-space>
          <a-button type="primary" size="large" @click="handleSubmit" :loading="submitting">
            <template #icon><icon-check /></template>
            创建并发布
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
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Message } from '@arco-design/web-vue';
import { IconCheck, IconPlus } from '@arco-design/web-vue/es/icon';
import { releaseApi, providerApi } from '@/api';
import type { Provider } from '@/types';

const router = useRouter();
const providers = ref<Provider[]>([]);
const currentVersion = ref('0.0.0');
const submitting = ref(false);

interface TunnelConfig {
  id: string;
  name: string;
  enabled: boolean;
  ssh: {
    host: string;
    port: number;
    username: string;
  };
  localPort: number;
}

const form = ref({
  providerId: '',
  version: '0.0.1',
  description: '',
  targetRoles: ['*'] as string[],
  tunnels: [] as TunnelConfig[],
  routing: {
    defaultTunnel: '',
    rules: [] as any[],
  },
  forceUpdate: false,
  forceRestart: false,
  notifyOnly: false,
});

const routingRulesJson = ref('');
const customConfigJson = ref('');

// Load providers on mount
onMounted(async () => {
  try {
    const response = await providerApi.list();
    providers.value = (response.data as any).data || response.data;
  } catch (error) {
    console.error('加载供应商列表失败:', error);
    Message.error('加载供应商列表失败');
  }
});

// Load provider config when selected
const loadProviderConfig = async () => {
  if (!form.value.providerId) return;

  try {
    // Get latest version
    const response = await releaseApi.getLatest(form.value.providerId);
    const latestData = (response.data as any).data || response.data;
    currentVersion.value = latestData?.version || '0.0.0';

    // Auto-increment version
    const parts = currentVersion.value.split('.');
    const newPatch = (parseInt(parts[2]) || 0) + 1;
    form.value.version = `${parts[0]}.${parts[1]}.${newPatch}`;

    // Load current config if exists
    if (latestData?.config) {
      console.log('[CreateRelease] Loading config:', latestData.config);

      // Pre-fill with existing tunnels
      if (latestData.config.tunnels) {
        form.value.tunnels = latestData.config.tunnels.map((t: any) => {
          const tunnel = {
            id: t.id || '',
            name: t.name || '',
            enabled: t.enabled !== false,
            ssh: {
              host: t.ssh?.host || '',
              port: t.ssh?.port || 22,
              username: t.ssh?.username || form.value.providerId,
            },
            localPort: t.localPort || 1080,
          };
          console.log('[CreateRelease] Loaded tunnel:', tunnel);
          return tunnel;
        });
      }

      // Pre-fill routing
      if (latestData.config.routing) {
        form.value.routing.defaultTunnel = latestData.config.routing.defaultTunnel || '';
        if (latestData.config.routing.rules?.length > 0) {
          routingRulesJson.value = JSON.stringify(latestData.config.routing.rules, null, 2);
        }
      }
    }

    Message.success(`已加载供应商配置，版本号: ${form.value.version}`);
  } catch (error: any) {
    console.error('加载供应商配置失败:', error);
    // If no config exists yet, that's okay - start fresh
    currentVersion.value = '0.0.0';
    form.value.version = '0.0.1';
    form.value.tunnels = [];
  }
};

// Add new tunnel
const addTunnel = () => {
  form.value.tunnels.push({
    id: '',
    name: '',
    enabled: true,
    ssh: {
      host: '',
      port: 22,
      username: form.value.providerId || '',
    },
    localPort: 1080 + form.value.tunnels.length,
  });
};

// Remove tunnel
const removeTunnel = (index: number) => {
  form.value.tunnels.splice(index, 1);
};

// Submit release
const handleSubmit = async () => {
  // Validation
  if (!form.value.providerId) {
    Message.error('请选择供应商');
    return;
  }

  if (!form.value.version) {
    Message.error('请输入版本号');
    return;
  }

  if (!form.value.description) {
    Message.error('请输入发布描述');
    return;
  }

  if (form.value.tunnels.length === 0) {
    Message.error('请至少添加一个隧道配置');
    return;
  }

  // Validate tunnels
  for (let i = 0; i < form.value.tunnels.length; i++) {
    const tunnel = form.value.tunnels[i];
    const missingFields: string[] = [];

    if (!tunnel.id || tunnel.id.trim() === '') missingFields.push('隧道ID');
    if (!tunnel.name || tunnel.name.trim() === '') missingFields.push('隧道名称');
    if (!tunnel.ssh.host || tunnel.ssh.host.trim() === '') missingFields.push('SSH主机');
    if (!tunnel.ssh.username || tunnel.ssh.username.trim() === '') missingFields.push('SSH用户名');
    if (!tunnel.localPort || tunnel.localPort <= 0) missingFields.push('本地端口');

    if (missingFields.length > 0) {
      Message.error(`隧道 ${i + 1} "${tunnel.id || '(未命名)'}" 配置不完整，缺少: ${missingFields.join('、')}`);
      console.error('Incomplete tunnel:', tunnel);
      return;
    }
  }

  try {
    submitting.value = true;

    // Parse routing rules
    let routingRules: any[] = [];
    if (routingRulesJson.value.trim()) {
      try {
        routingRules = JSON.parse(routingRulesJson.value);
      } catch (error) {
        Message.error('路由规则 JSON 格式错误');
        submitting.value = false;
        return;
      }
    }

    // Parse custom config
    let customConfig: any = {};
    if (customConfigJson.value.trim()) {
      try {
        customConfig = JSON.parse(customConfigJson.value);
      } catch (error) {
        Message.error('自定义配置 JSON 格式错误');
        submitting.value = false;
        return;
      }
    }

    // Build release payload
    const releaseData = {
      version: form.value.version,
      providerId: form.value.providerId,
      description: form.value.description,
      strategy: {
        type: form.value.notifyOnly ? 'graceful' : 'immediate',
        forceUpdate: form.value.forceUpdate,
        forceRestart: form.value.forceRestart,
        notifyOnly: form.value.notifyOnly,
      },
      target: {
        roles: form.value.targetRoles,
      },
      config: {
        version: form.value.version,
        tunnels: form.value.tunnels,
        routing: {
          defaultTunnel: form.value.routing.defaultTunnel,
          rules: routingRules,
        },
        ...customConfig,
      },
    };

    console.log('[CreateRelease] Submitting:', releaseData);

    await releaseApi.create(releaseData as any);

    Message.success(`版本 ${form.value.version} 创建成功！`);
    setTimeout(() => {
      router.push('/releases');
    }, 1000);
  } catch (error: any) {
    console.error('[CreateRelease] Failed:', error);
    Message.error(error.response?.data?.error || '创建发布失败');
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.create-release-simple {
  padding: 0;
}

.form-tip {
  font-size: 12px;
  color: var(--color-text-3);
  margin-top: 4px;
}

:deep(.arco-divider-text) {
  font-size: 14px;
  font-weight: 600;
}
</style>
