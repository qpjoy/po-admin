// Provider Types
export interface Provider {
  id: string;
  name: string;
  description?: string;
  sshKeys: SSHKey[];
  createdAt: string;
  updatedAt: string;
}

// SSH Key Types
export interface SSHKey {
  id: string;
  name: string;
  description: string;
  type: 'leader' | 'employee' | 'contractor' | 'custom' | 'common';
  publicKey: string;
  privateKey?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tunnel Types
export interface TunnelDefinition {
  id: string;
  name: string;
  enabled: boolean;
  ssh: {
    host: string;
    port: number;
    username: string;
    privateKeyPath?: string;
  };
  localPort: number;
  description?: string;
}

// Routing Types
export interface RoutingRule {
  id: string;
  name: string;
  type: 'whitelist' | 'blacklist';
  domains: string[];
  tunnel: string;
  priority: number;
  enabled: boolean;
}

export interface RoutingConfig {
  defaultTunnel: string;
  rules: RoutingRule[];
}

// Release Types
export interface ReleaseStrategy {
  type: 'graceful' | 'immediate';
  forceUpdate?: boolean;
  forceRestart?: boolean;
  notifyOnly?: boolean;
}

export interface ReleaseTarget {
  roles: string[];
}

export interface ReleaseFields {
  tunnels?: {
    action: 'add' | 'modify' | 'remove';
    tunnelId: string;
    config?: TunnelDefinition;
    requiresRestart: boolean;
  };
  routing?: {
    action: 'add' | 'modify' | 'remove';
    ruleId?: string;
    config?: RoutingConfig;
    requiresRestart: boolean;
  };
  tokens?: {
    action: 'add' | 'modify' | 'remove';
    tokenId: string;
    config?: any;
    requiresRestart: boolean;
  };
  sshKeys?: {
    action: 'add' | 'modify' | 'remove';
    keyId: string;
    config?: SSHKey;
    requiresRestart: boolean;
  };
}

export interface Release {
  version: string;
  providerId: string;
  description: string;
  strategy: ReleaseStrategy;
  target: ReleaseTarget;
  fields: ReleaseFields;
  createdAt: string;
  updatedBy?: string;
}

// Statistics Types
export interface ClientStats {
  providerId: string;
  keyId: string;
  currentVersion: string;
  lastCheckUpdate: string;
  tunnelStatuses: {
    tunnelId: string;
    status: string;
    uptime: number;
  }[];
}

export interface VersionDistribution {
  version: string;
  count: number;
  percentage: number;
}
