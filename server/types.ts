export interface Organization {
  id: number;
  name: string;
  created_at: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  avatar_url: string | null;
  oauth_provider: 'google' | 'github' | 'dev';
  oauth_id: string;
  org_id: number;
  role: 'member' | 'org_admin' | 'super_admin';
  created_at: string;
}

export interface Session {
  sid: string;
  session_json: string;
  expires_at: number;
}

export interface Estimate {
  id: number;
  org_id: number;
  user_id: number;
  specs_json: string;
  results_json: string;
  cheapest_platform: string;
  monthly_cost_usd: number;
  created_at: string;
  userName?: string;
  userEmail?: string;
}

export interface Alert {
  id: number;
  org_id: number;
  type: 'cost_threshold' | 'estimate_run' | 'upload_failed';
  message: string;
  metadata_json: string | null;
  is_read: number;
  created_at: string;
}

export interface OrgSettings {
  org_id: number;
  cost_alert_threshold_usd: number | null;
  default_cpu: number;
  default_ram: number;
  default_storage: number;
  default_bandwidth: number;
}

export interface UploadSession {
  id: string;
  org_id: number;
  user_id: number;
  filename: string;
  total_size: number;
  total_chunks: number;
  chunks_received: number;
  received_chunks_json: string;
  status: 'in_progress' | 'completed' | 'failed' | 'expired';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
