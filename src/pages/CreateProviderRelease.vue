<template>
  <div class="create-provider-release">
    <a-page-header
      title="创建发布"
      subtitle="为供应商创建新版本配置"
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
                @change="loadCurrentConfig"
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
                placeholder="将自动递增"
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
            placeholder="描述本次更新的内容"
            :max-length="500"
            show-word-limit
            :auto-size="{ minRows: 2, maxRows: 4 }"
          />
        </a-form-item>

        <!-- Tunnels Configuration -->
        <a-divider orientation="left">SSH 隧道配置</a-divider>

        <a-space direction="vertical" fill style="width: 100%;">
          <a-card
            v-for="(tunnel, index) in form.config.tunnels"
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
                size="small"
                @click="removeTunnel(index)"
              >
                删除
              </a-button>
            </template>

            <a-row :gutter="16">
              <a-col :span="6">
                <a-form-item label="隧道 ID" required>
                  <a-input v-model="tunnel.id" placeholder="vpn" />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="隧道名称" required>
                  <a-input v-model="tunnel.name" placeholder="VPN 隧道" />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="SSH 主机" required>
                  <a-input v-model="tunnel.ssh.host" placeholder="23.225.161.60" />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="本地端口" required>
                  <a-input-number
                    v-model="tunnel.localPort"
                    :min="1024"
                    :max="65535"
                    style="width: 100%;"
                  />
                </a-form-item>
              </a-col>
            </a-row>

            <a-row :gutter="16">
              <a-col :span="6">
                <a-form-item label="SSH 端口">
                  <a-input-number
                    v-model="tunnel.ssh.port"
                    :min="1"
                    :max="65535"
                    style="width: 100%;"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="SSH 用户名" required>
                  <a-input v-model="tunnel.ssh.username" :placeholder="form.providerId" />
                </a-form-item>
              </a-col>
              <a-col :span="6">
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

        <a-form-item label="默认隧道 (可选)">
          <a-select v-model="form.config.routing.defaultTunnel" placeholder="选择默认隧道" allow-clear>
            <a-option value="">不使用默认隧道</a-option>
            <a-option
              v-for="tunnel in form.config.tunnels"
              :key="tunnel.id"
              :value="tunnel.id"
            >
              {{ tunnel.name }} ({{ tunnel.id }})
            </a-option>
          </a-select>
          <div class="form-tip">未匹配白名单规则的流量，如果设置默认隧道则使用此隧道，否则直接连接</div>
        </a-form-item>

        <a-form-item label="路由规则 (可选)">
          <div style="margin-bottom: 12px;">
            <div style="font-size: 12px; color: var(--color-text-3); margin-bottom: 8px;">快速添加常用网站:</div>
            <a-space>
              <a-button size="small" @click="addPresetRule('google')">Google</a-button>
              <a-button size="small" @click="addPresetRule('youtube')">YouTube</a-button>
              <a-button size="small" @click="addPresetRule('x')">X (Twitter)</a-button>
              <a-button size="small" @click="addPresetRule('facebook')">Facebook</a-button>
              <a-button size="small" @click="addPresetRule('instagram')">Instagram</a-button>
            </a-space>
          </div>

          <a-space direction="vertical" fill style="width: 100%;">
            <a-card
              v-for="(rule, index) in form.config.routing.rules"
              :key="index"
              :bordered="true"
              size="small"
              style="margin-bottom: 12px;"
            >
              <template #title>
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                  <span>{{ rule.name || `规则 ${index + 1}` }}</span>
                  <a-switch v-model="rule.enabled" size="small">
                    <template #checked>启用</template>
                    <template #unchecked>禁用</template>
                  </a-switch>
                </div>
              </template>
              <template #extra>
                <a-button
                  type="text"
                  status="danger"
                  size="small"
                  @click="removeRule(index)"
                >
                  删除
                </a-button>
              </template>

              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="规则名称">
                    <a-input v-model="rule.name" placeholder="Google Services" />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="优先级">
                    <a-input-number v-model="rule.priority" :min="1" :max="100" style="width: 100%;" />
                    <div class="form-tip" style="font-size: 11px;">数字越大优先级越高</div>
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="规则类型">
                    <a-select v-model="rule.type">
                      <a-option value="whitelist">白名单</a-option>
                      <a-option value="blacklist">黑名单</a-option>
                    </a-select>
                  </a-form-item>
                </a-col>
              </a-row>

              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="域名列表 (每行一个)">
                    <a-textarea
                      :model-value="rule.domains.join('\n')"
                      @update:model-value="rule.domains = $event.split('\n').filter(d => d.trim())"
                      placeholder="google.com&#10;*.google.com&#10;googleapis.com"
                      :auto-size="{ minRows: 3, maxRows: 8 }"
                    />
                    <div class="form-tip" style="font-size: 11px;">支持通配符: *.google.com</div>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="使用隧道">
                    <a-select v-model="rule.tunnel">
                      <a-option
                        v-for="tunnel in form.config.tunnels"
                        :key="tunnel.id"
                        :value="tunnel.id"
                      >
                        {{ tunnel.name }} ({{ tunnel.id }})
                      </a-option>
                    </a-select>
                  </a-form-item>
                  <div style="margin-top: 8px; padding: 8px; background: var(--color-fill-2); border-radius: 4px;">
                    <div style="font-size: 12px; font-weight: 500; margin-bottom: 4px;">当前已添加 {{ rule.domains.length }} 个域名</div>
                    <a-space wrap size="mini">
                      <a-tag v-for="(domain, i) in rule.domains.slice(0, 5)" :key="i" size="small">
                        {{ domain }}
                      </a-tag>
                      <a-tag v-if="rule.domains.length > 5" size="small">+{{ rule.domains.length - 5 }} more</a-tag>
                    </a-space>
                  </div>
                </a-col>
              </a-row>
            </a-card>
          </a-space>
          <a-button type="dashed" long @click="addRule" style="margin-top: 8px;">
            <template #icon><icon-plus /></template>
            添加路由规则
          </a-button>
        </a-form-item>

        <!-- Extra Config (JSON) -->
        <a-divider orientation="left">额外配置 (可选)</a-divider>

        <a-form-item label="业务配置 (JSON格式)">
          <a-textarea
            v-model="extraConfigJson"
            placeholder='{"token": "your-token", "apiEndpoint": "https://api.example.com"}'
            :auto-size="{ minRows: 4, maxRows: 10 }"
          />
          <div class="form-tip">
            这些配置会合并到 config 根对象，客户端可通过 config.token 等访问
          </div>
        </a-form-item>

        <!-- Update Strategy -->
        <a-divider orientation="left">更新策略</a-divider>

        <a-row :gutter="16">
          <a-col :span="6">
            <a-form-item label="更新方式">
              <a-select v-model="form.strategy.type">
                <a-option value="immediate">立即更新</a-option>
                <a-option value="graceful">友好提示</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="强制更新">
              <a-switch v-model="form.strategy.forceUpdate" />
              <div class="form-tip">用户无法跳过</div>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="强制重启">
              <a-switch v-model="form.strategy.forceRestart" />
              <div class="form-tip">更新后重启</div>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="仅通知">
              <a-switch v-model="form.strategy.notifyOnly" />
              <div class="form-tip">不更新配置</div>
            </a-form-item>
          </a-col>
        </a-row>

        <!-- Submit -->
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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Message } from '@arco-design/web-vue';
import { IconCheck, IconPlus } from '@arco-design/web-vue/es/icon';
import { providerApi } from '@/api';
import axios from 'axios';

const router = useRouter();
const providers = ref<any[]>([]);
const currentVersion = ref('0.0.0');
const submitting = ref(false);
const extraConfigJson = ref('');

const form = ref({
  providerId: '',
  version: '0.0.1',
  description: '',
  targetRoles: ['*'] as string[],
  strategy: {
    type: 'immediate' as 'immediate' | 'graceful',
    forceUpdate: false,
    forceRestart: false,
    notifyOnly: false,
  },
  config: {
    version: '0.0.1',
    tunnels: [] as Array<{
      id: string;
      name: string;
      enabled: boolean;
      ssh: {
        host: string;
        port: number;
        username: string;
      };
      localPort: number;
    }>,
    routing: {
      defaultTunnel: '',
      rules: [] as Array<{
        id: string;
        name: string;
        type: 'whitelist' | 'blacklist';
        domains: string[];
        tunnel: string;
        priority: number;
        enabled: boolean;
      }>,
    },
  },
});

// Load providers
onMounted(async () => {
  try {
    const response = await providerApi.list();
    providers.value = (response.data as any).data || response.data;
  } catch (error) {
    console.error('加载供应商列表失败:', error);
    Message.error('加载供应商列表失败');
  }
});

// Load current config when provider selected
const loadCurrentConfig = async () => {
  if (!form.value.providerId) return;

  try {
    // Get latest release for this provider
    const response = await axios.get(`/api/provider-releases/latest?provider=${form.value.providerId}`);
    const latest = (response.data as any).data;

    if (latest) {
      currentVersion.value = latest.version;

      // Auto-increment version
      const parts = latest.version.split('.');
      const newPatch = (parseInt(parts[2]) || 0) + 1;
      form.value.version = `${parts[0]}.${parts[1]}.${newPatch}`;
      form.value.config.version = form.value.version;

      // Load current config
      form.value.config.tunnels = latest.config.tunnels || [];
      form.value.config.routing = latest.config.routing || { defaultTunnel: '', rules: [] };

      // Extract extra config (everything except version, tunnels, routing)
      const { version, tunnels, routing, ...extraConfig } = latest.config;
      if (Object.keys(extraConfig).length > 0) {
        extraConfigJson.value = JSON.stringify(extraConfig, null, 2);
      }

      Message.success(`已加载当前配置，版本: ${form.value.version}`);
    } else {
      // No releases yet
      currentVersion.value = '0.0.0';
      form.value.version = '0.0.1';
      form.value.config.version = '0.0.1';
      form.value.config.tunnels = [];
      Message.info('该供应商尚无发布记录，将创建首个版本');
    }
  } catch (error: any) {
    console.error('加载配置失败:', error);
    currentVersion.value = '0.0.0';
    form.value.version = '0.0.1';
    form.value.config.version = '0.0.1';
    Message.info('该供应商尚无发布记录，将创建首个版本');
  }
};

// Tunnel management
const addTunnel = () => {
  form.value.config.tunnels.push({
    id: '',
    name: '',
    enabled: true,
    ssh: {
      host: '',
      port: 22,
      username: form.value.providerId || '',
    },
    localPort: 1080 + form.value.config.tunnels.length,
  });
};

const removeTunnel = (index: number) => {
  form.value.config.tunnels.splice(index, 1);
};

// Site presets with comprehensive domain lists
const sitePresets = {
  google: {
    name: 'Google Services',
    domains: [
      'google.com',
      '*.google.com',
      'google.com.hk',
      'googleapis.com',
      '*.googleapis.com',
      'gstatic.com',
      '*.gstatic.com',
      'googleusercontent.com',
      '*.googleusercontent.com',
    ],
  },
  youtube: {
    name: 'YouTube',
    domains: [
      'youtube.com',
      '*.youtube.com',
      'youtu.be',
      'googlevideo.com',
      '*.googlevideo.com',
      'ytimg.com',
      '*.ytimg.com',
      'ggpht.com',
      '*.ggpht.com',
      'wide-youtube.l.google.com',
      'youtube-ui.l.google.com',
    ],
  },
  x: {
    name: 'X (Twitter)',
    domains: [
      'x.com',
      '*.x.com',
      'twitter.com',
      '*.twitter.com',
      'twimg.com',
      '*.twimg.com',
      't.co',
    ],
  },
  facebook: {
    name: 'Facebook',
    domains: [
      'facebook.com',
      '*.facebook.com',
      'fb.com',
      '*.fb.com',
      'fbcdn.net',
      '*.fbcdn.net',
      'fbsbx.com',
      '*.fbsbx.com',
    ],
  },
  instagram: {
    name: 'Instagram',
    domains: [
      'instagram.com',
      '*.instagram.com',
      'cdninstagram.com',
      '*.cdninstagram.com',
    ],
  },
};

// Routing rule management
const addRule = () => {
  const defaultTunnel = form.value.config.routing.defaultTunnel ||
                       (form.value.config.tunnels.length > 0 ? form.value.config.tunnels[0].id : '');

  form.value.config.routing.rules.push({
    id: `rule-${Date.now()}`,
    name: '',
    type: 'whitelist',
    domains: [],
    tunnel: defaultTunnel,
    priority: 10,
    enabled: true,
  });
};

const removeRule = (index: number) => {
  form.value.config.routing.rules.splice(index, 1);
};

// Add preset rule
const addPresetRule = (presetId: keyof typeof sitePresets) => {
  const preset = sitePresets[presetId];
  if (!preset) return;

  // Check if this preset already exists
  const exists = form.value.config.routing.rules.some(r => r.name === preset.name);
  if (exists) {
    Message.warning(`规则 "${preset.name}" 已存在`);
    return;
  }

  const defaultTunnel = form.value.config.routing.defaultTunnel ||
                       (form.value.config.tunnels.length > 0 ? form.value.config.tunnels[0].id : '');

  form.value.config.routing.rules.push({
    id: `preset-${presetId}`,
    name: preset.name,
    type: 'whitelist',
    domains: [...preset.domains],
    tunnel: defaultTunnel,
    priority: 10,
    enabled: true,
  });

  Message.success(`已添加 ${preset.name} 规则，包含 ${preset.domains.length} 个域名`);
};

// Submit
const handleSubmit = async () => {
  // Validation
  if (!form.value.providerId) {
    Message.error('请选择供应商');
    return;
  }

  if (!form.value.description) {
    Message.error('请输入发布描述');
    return;
  }

  if (form.value.config.tunnels.length === 0) {
    Message.error('请至少添加一个隧道');
    return;
  }

  // Validate tunnels
  for (let i = 0; i < form.value.config.tunnels.length; i++) {
    const tunnel = form.value.config.tunnels[i];
    if (!tunnel.id || !tunnel.name || !tunnel.ssh.host || !tunnel.ssh.username) {
      Message.error(`隧道 ${i + 1} 配置不完整`);
      return;
    }
  }

  if (!form.value.config.routing.defaultTunnel) {
    Message.error('请选择默认隧道');
    return;
  }

  try {
    submitting.value = true;

    // Parse extra config
    let extraConfig: any = {};
    if (extraConfigJson.value.trim()) {
      try {
        extraConfig = JSON.parse(extraConfigJson.value);
      } catch (error) {
        Message.error('额外配置 JSON 格式错误');
        submitting.value = false;
        return;
      }
    }

    // Build final config (merge extra config into root)
    const finalConfig = {
      version: form.value.version,
      tunnels: form.value.config.tunnels,
      routing: form.value.config.routing,
      ...extraConfig,
    };

    // Build release payload
    const payload = {
      providerId: form.value.providerId,
      config: finalConfig,
      description: form.value.description,
      strategy: form.value.strategy,
      target: {
        roles: form.value.targetRoles,
      },
    };

    console.log('[CreateProviderRelease] Submitting:', payload);

    await axios.post('/api/provider-releases', payload);

    Message.success(`版本 ${form.value.version} 创建成功！`);
    setTimeout(() => {
      router.push('/releases');
    }, 1000);
  } catch (error: any) {
    console.error('[CreateProviderRelease] Failed:', error);
    Message.error(error.response?.data?.error || '创建发布失败');
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.create-provider-release {
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
