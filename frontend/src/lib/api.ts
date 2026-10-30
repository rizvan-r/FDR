import { supabase, isSupabaseConfigured } from './supabase';
import {
  Region,
  Institution,
  Bank,
  BankBranch,
  UserProfile,
  UserRole,
  FDR,
  FDRDocument,
  FDREvent,
  FDRSummaryStats,
  FDRFilterParams,
  DocumentType,
  TrustTier,
  VerificationRequest,
  BankAttestation,
  BankKey,
  SignedFDRPayload,
  HeartbeatPolicy,
  HeartbeatCheck,
  FDRAlert,
  HeartbeatDashboardStats,
  FDRHeartbeatStatus,
  RenewalCase,
  RenewalEvidence,
  FDRLineageGraph,
  MatchingResult,
  RenewalDashboardStats,
  OfficerTask,
  TaskAssignment,
  TaskComment,
  TaskEscalation,
  OfficerNotification,
  QueuePolicy,
  OfficerWorkloadSummary,
  OfficerDashboardStats,
  MigrationBatchSummary,
  MigrationBatchDetail,
  MigrationRowItem,
  ColumnMappingItem,
  ColumnMappingRequest,
  MigrationMappingProfile,
  ComplianceTemplate,
  ComplianceDocument,
  ComplianceDocumentVersion,
  DocumentReview,
  MockSignatureRecord,
} from '../types';
import {
  SEED_REGIONS,
  SEED_BANKS,
  SEED_BRANCHES,
  SEED_INSTITUTIONS,
  DEMO_USERS,
  SEED_FDRS,
  SEED_BANK_KEYS,
  SEED_VERIFICATION_REQUESTS,
  SEED_ATTESTATIONS,
  SEED_HEARTBEAT_POLICIES,
  SEED_HEARTBEAT_CHECKS,
  SEED_FDR_ALERTS,
  SEED_HEARTBEAT_STATS,
  SEED_RENEWAL_CASES,
  SEED_FDR_LINEAGE,
  SEED_RENEWAL_EVIDENCE,
  SEED_RENEWAL_STATS,
  SEED_OFFICER_TASKS,
  SEED_TASK_ASSIGNMENTS,
  SEED_TASK_COMMENTS,
  SEED_TASK_ESCALATIONS,
  SEED_OFFICER_NOTIFICATIONS,
  SEED_QUEUE_POLICIES,
  SEED_OFFICER_WORKLOAD,
  SEED_OFFICER_DASHBOARD_STATS,
  SEED_MIGRATION_PROFILES,
  SEED_MIGRATION_BATCHES,
  SEED_COMPLIANCE_TEMPLATES,
  SEED_COMPLIANCE_DOCUMENTS,
} from './mockData';

// Storage keys for local development persistence
const STORAGE_KEYS = {
  REGIONS: 'fdr_dev_regions',
  BANKS: 'fdr_dev_banks',
  BRANCHES: 'fdr_dev_branches',
  INSTITUTIONS: 'fdr_dev_institutions',
  USERS: 'fdr_dev_users',
  FDRS: 'fdr_dev_fdrs',
  BANK_KEYS: 'fdr_dev_bank_keys',
  VERIFICATION_REQUESTS: 'fdr_dev_verification_requests',
  ATTESTATIONS: 'fdr_dev_attestations',
  HEARTBEAT_POLICIES: 'fdr_dev_heartbeat_policies',
  HEARTBEAT_CHECKS: 'fdr_dev_heartbeat_checks',
  FDR_ALERTS: 'fdr_dev_alerts',
  RENEWAL_CASES: 'fdr_dev_renewal_cases',
  OFFICER_TASKS: 'fdr_dev_officer_tasks',
  TASK_COMMENTS: 'fdr_dev_task_comments',
  TASK_ESCALATIONS: 'fdr_dev_task_escalations',
  OFFICER_NOTIFICATIONS: 'fdr_dev_officer_notifications',
  QUEUE_POLICIES: 'fdr_dev_queue_policies',
  FDR_LINEAGE: 'fdr_dev_lineage',
  RENEWAL_EVIDENCE: 'fdr_dev_renewal_evidence',
  MIGRATION_BATCHES: 'fdr_dev_migration_batches',
  MIGRATION_PROFILES: 'fdr_dev_migration_profiles',
  COMPLIANCE_TEMPLATES: 'fdr_dev_compliance_templates',
  COMPLIANCE_DOCUMENTS: 'fdr_dev_compliance_documents',
};

function getLocalOrInit<T>(key: string, seed: T[]): T[] {
  const existing = localStorage.getItem(key);
  if (!existing) {
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(existing);
  } catch {
    return seed;
  }
}

function saveLocal<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ==============================================================================
// 1. REGIONS API
// ==============================================================================
export async function fetchRegions(): Promise<Region[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .order('name');
      if (!error && data && data.length > 0) {
        return data as Region[];
      }
    } catch {
      // Fall through to local fallback
    }
  }
  return getLocalOrInit(STORAGE_KEYS.REGIONS, SEED_REGIONS);
}

export async function createRegion(region: Omit<Region, 'id' | 'created_at' | 'updated_at'>): Promise<Region> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('regions')
      .insert([region])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Region;
  }
  const current = getLocalOrInit(STORAGE_KEYS.REGIONS, SEED_REGIONS);
  const newRecord: Region = {
    ...region,
    id: `reg-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  saveLocal(STORAGE_KEYS.REGIONS, [newRecord, ...current]);
  return newRecord;
}

export async function updateRegion(id: string, updates: Partial<Region>): Promise<Region> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('regions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Region;
  }
  const current = getLocalOrInit(STORAGE_KEYS.REGIONS, SEED_REGIONS);
  const index = current.findIndex((r) => r.id === id);
  if (index === -1) throw new Error('Region not found');
  const updated = { ...current[index], ...updates, updated_at: new Date().toISOString() };
  current[index] = updated;
  saveLocal(STORAGE_KEYS.REGIONS, current);
  return updated;
}

// ==============================================================================
// 2. INSTITUTIONS API
// ==============================================================================
export async function fetchInstitutions(): Promise<Institution[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('institutions')
        .select('*, region:regions(*)')
        .order('name');
      if (!error && data && data.length > 0) {
        return data as Institution[];
      }
    } catch {
      // Fall through to local fallback
    }
  }
  const institutions = getLocalOrInit(STORAGE_KEYS.INSTITUTIONS, SEED_INSTITUTIONS);
  const regions = getLocalOrInit(STORAGE_KEYS.REGIONS, SEED_REGIONS);
  return institutions.map((inst) => ({
    ...inst,
    region: regions.find((r) => r.id === inst.region_id),
  }));
}

export async function fetchInstitutionById(id: string): Promise<Institution> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('institutions')
        .select('*, region:regions(*)')
        .eq('id', id)
        .single();
      if (!error && data) {
        return data as Institution;
      }
    } catch {
      // Fall through to local fallback
    }
  }
  const list = await fetchInstitutions();
  const found = list.find((i) => i.id === id);
  if (!found) throw new Error('Institution not found');
  return found;
}

export async function createInstitution(institution: Omit<Institution, 'id' | 'created_at' | 'updated_at'>): Promise<Institution> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('institutions')
      .insert([institution])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Institution;
  }
  const current = getLocalOrInit(STORAGE_KEYS.INSTITUTIONS, SEED_INSTITUTIONS);
  // Check unique code
  if (current.some((i) => i.code.toLowerCase() === institution.code.toLowerCase())) {
    throw new Error(`Institution code '${institution.code}' is already registered.`);
  }
  const newRecord: Institution = {
    ...institution,
    id: `inst-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  saveLocal(STORAGE_KEYS.INSTITUTIONS, [newRecord, ...current]);
  return newRecord;
}

export async function updateInstitution(id: string, updates: Partial<Institution>): Promise<Institution> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('institutions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Institution;
  }
  const current = getLocalOrInit(STORAGE_KEYS.INSTITUTIONS, SEED_INSTITUTIONS);
  const index = current.findIndex((i) => i.id === id);
  if (index === -1) throw new Error('Institution not found');
  const updated = { ...current[index], ...updates, updated_at: new Date().toISOString() };
  current[index] = updated;
  saveLocal(STORAGE_KEYS.INSTITUTIONS, current);
  return updated;
}

// ==============================================================================
// 3. BANKS & BRANCHES API
// ==============================================================================
export async function fetchBanks(): Promise<Bank[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*, bank_branches(count)')
        .order('name');
      if (!error && data && data.length > 0) {
        return data.map((b: any) => ({
          ...b,
          branch_count: b.bank_branches?.[0]?.count || 0,
        })) as Bank[];
      }
    } catch {
      // Fall through to local fallback
    }
  }
  const banks = getLocalOrInit(STORAGE_KEYS.BANKS, SEED_BANKS);
  const branches = getLocalOrInit(STORAGE_KEYS.BRANCHES, SEED_BRANCHES);
  return banks.map((bank) => ({
    ...bank,
    branch_count: branches.filter((b) => b.bank_id === bank.id).length,
  }));
}

export async function fetchBankById(id: string): Promise<Bank> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) {
        return data as Bank;
      }
    } catch {
      // Fall through to local fallback
    }
  }
  const banks = await fetchBanks();
  const found = banks.find((b) => b.id === id);
  if (!found) throw new Error('Bank not found');
  return found;
}

export async function createBank(bank: Omit<Bank, 'id' | 'created_at' | 'updated_at' | 'branch_count'>): Promise<Bank> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('banks')
      .insert([bank])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Bank;
  }
  const current = getLocalOrInit(STORAGE_KEYS.BANKS, SEED_BANKS);
  if (current.some((b) => b.code.toLowerCase() === bank.code.toLowerCase())) {
    throw new Error(`Bank with code '${bank.code}' already exists.`);
  }
  const newRecord: Bank = {
    ...bank,
    id: `bank-${Date.now()}`,
    branch_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  saveLocal(STORAGE_KEYS.BANKS, [newRecord, ...current]);
  return newRecord;
}

export async function fetchBranchesByBankId(bankId: string): Promise<BankBranch[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('bank_branches')
        .select('*, region:regions(*)')
        .eq('bank_id', bankId)
        .order('branch_name');
      if (!error && data && data.length > 0) {
        return data as BankBranch[];
      }
    } catch {
      // Fall through to local fallback
    }
  }
  const branches = getLocalOrInit(STORAGE_KEYS.BRANCHES, SEED_BRANCHES);
  const regions = getLocalOrInit(STORAGE_KEYS.REGIONS, SEED_REGIONS);
  const banks = getLocalOrInit(STORAGE_KEYS.BANKS, SEED_BANKS);
  const targetBank = banks.find((b) => b.id === bankId || b.code === bankId);

  let matched = branches.filter((b) => {
    if (b.bank_id === bankId) return true;
    if (targetBank && targetBank.code && b.ifsc_code.toUpperCase().startsWith(targetBank.code.toUpperCase())) {
      return true;
    }
    return false;
  });

  if (matched.length === 0) {
    const code = targetBank?.code || 'BANK';
    matched = [
      {
        id: `branch-${bankId}-main`,
        bank_id: bankId,
        branch_name: `${targetBank?.name || 'Main'} Branch, Parliament Street`,
        branch_code: '00001',
        ifsc_code: `${code.padEnd(4, 'X').slice(0, 4)}0000001`,
        region_id: 'reg-01',
        address: '11, Parliament Street',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
        contact_email: `desk@${code.toLowerCase()}.gov.in`,
        contact_phone: '+91-11-23370000',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }

  return matched.map((b) => ({
    ...b,
    region: regions.find((r) => r.id === b.region_id),
  }));
}

export async function createBranch(branch: Omit<BankBranch, 'id' | 'created_at' | 'updated_at'>): Promise<BankBranch> {
  // Validate standard Indian IFSC code format: 4 letters, 0, 6 alphanumeric chars
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!ifscRegex.test(branch.ifsc_code.toUpperCase())) {
    throw new Error('Invalid IFSC Code format. Format must be 4 uppercase letters, a zero, and 6 alphanumeric characters (e.g., SBIN0000691).');
  }

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('bank_branches')
      .insert([{ ...branch, ifsc_code: branch.ifsc_code.toUpperCase() }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as BankBranch;
  }
  const current = getLocalOrInit(STORAGE_KEYS.BRANCHES, SEED_BRANCHES);
  if (current.some((b) => b.ifsc_code.toUpperCase() === branch.ifsc_code.toUpperCase())) {
    throw new Error(`Branch with IFSC '${branch.ifsc_code.toUpperCase()}' is already registered.`);
  }
  const newRecord: BankBranch = {
    ...branch,
    ifsc_code: branch.ifsc_code.toUpperCase(),
    id: `branch-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  saveLocal(STORAGE_KEYS.BRANCHES, [newRecord, ...current]);
  return newRecord;
}

// ==============================================================================
// 4. USERS & RBAC API
// ==============================================================================
export async function fetchUsers(): Promise<UserProfile[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*, institution:institutions(*), bank:banks(*), bank_branch:bank_branches(*), user_roles(roles(name)), user_region_scopes(region_id)')
      .order('full_name');
    if (error) throw new Error(error.message);
    return (data || []).map((u: any) => ({
      ...u,
      roles: (u.user_roles || []).map((ur: any) => ur.roles?.name).filter(Boolean) as UserRole[],
      region_scopes: (u.user_region_scopes || []).map((urs: any) => urs.region_id),
    }));
  }
  const current = getLocalOrInit(STORAGE_KEYS.USERS, Object.values(DEMO_USERS));
  return current;
}

export async function toggleUserActive(userId: string, isActive: boolean): Promise<void> {
  if (isSupabaseConfigured) {
    // Call backend FastAPI endpoint for privileged status toggle
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';

    const res = await fetch(`${apiUrl}/api/users/${userId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ is_active: isActive }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update user status.');
    }
    return;
  }
  const current = getLocalOrInit(STORAGE_KEYS.USERS, Object.values(DEMO_USERS));
  const user = current.find((u) => u.id === userId);
  if (user) {
    user.is_active = isActive;
    saveLocal(STORAGE_KEYS.USERS, current);
  }
}

export async function updateUserRole(userId: string, newRole: UserRole): Promise<void> {
  const current = getLocalOrInit(STORAGE_KEYS.USERS, Object.values(DEMO_USERS));
  const user = current.find((u) => u.id === userId);
  if (user) {
    user.roles = [newRole];
    saveLocal(STORAGE_KEYS.USERS, current);
  }
}

// ==============================================================================
// 5. BACKEND GATEWAY HEALTH
// ==============================================================================
export async function checkBackendHealth() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const res = await fetch(`${apiUrl}/api/health`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (error: any) {
    return {
      status: 'offline',
      service: 'FDR-Chain Backend API',
      message: 'FastAPI backend is offline or unreachable on ' + apiUrl,
    };
  }
}

// ==============================================================================
// 6. PHASE 2: FDR REPOSITORY & DOCUMENT MANAGEMENT API
// ==============================================================================

export async function computeSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (isSupabaseConfigured) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  }
  const activeRole = localStorage.getItem('fdr_demo_active_role') || 'system_admin';
  return { Authorization: `Bearer dev-${activeRole}-token` };
}

export async function fetchFDRs(
  params: FDRFilterParams = {}
): Promise<{ items: FDR[]; total: number; page: number; page_size: number }> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.page_size) queryParams.set('page_size', String(params.page_size));
  if (params.search) queryParams.set('search', params.search);
  if (params.bank_id) queryParams.set('bank_id', params.bank_id);
  if (params.institution_id) queryParams.set('institution_id', params.institution_id);
  if (params.lifecycle_status) queryParams.set('lifecycle_status', params.lifecycle_status);
  if (params.trust_tier) queryParams.set('trust_tier', String(params.trust_tier));
  if (params.verification_status) queryParams.set('verification_status', params.verification_status);
  if (params.region_id) queryParams.set('region_id', params.region_id);

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/fdrs?${queryParams.toString()}`, {
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Backend offline, fallback to local store below
  }

  // Local fallback
  const allFdrs = getLocalOrInit(STORAGE_KEYS.FDRS, SEED_FDRS);
  const banks = getLocalOrInit(STORAGE_KEYS.BANKS, SEED_BANKS);
  const branches = getLocalOrInit(STORAGE_KEYS.BRANCHES, SEED_BRANCHES);
  const institutions = getLocalOrInit(STORAGE_KEYS.INSTITUTIONS, SEED_INSTITUTIONS);
  const regions = getLocalOrInit(STORAGE_KEYS.REGIONS, SEED_REGIONS);

  let filtered = allFdrs.map((fdr) => {
    const bank = banks.find((b) => b.id === fdr.bank_id);
    const branch = branches.find((br) => br.id === fdr.branch_id);
    const inst = institutions.find((i) => i.id === fdr.institution_id);
    const reg = regions.find((r) => r.id === (fdr.region_id || branch?.region_id || inst?.region_id));
    return {
      ...fdr,
      bank,
      bank_name: fdr.bank_name || bank?.name,
      bank_code: fdr.bank_code || bank?.code,
      branch,
      branch_name: fdr.branch_name || branch?.branch_name,
      ifsc_code: fdr.ifsc_code || branch?.ifsc_code,
      institution: inst,
      institution_name: fdr.institution_name || inst?.name,
      institution_code: fdr.institution_code || inst?.code,
      region: reg,
      region_name: fdr.region_name || reg?.name,
    };
  });

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (f) =>
        f.fdr_number.toLowerCase().includes(q) ||
        f.lien_in_favour.toLowerCase().includes(q) ||
        f.bank_name?.toLowerCase().includes(q) ||
        f.institution_name?.toLowerCase().includes(q) ||
        f.ifsc_code?.toLowerCase().includes(q)
    );
  }
  if (params.bank_id) {
    filtered = filtered.filter((f) => f.bank_id === params.bank_id);
  }
  if (params.institution_id) {
    filtered = filtered.filter((f) => f.institution_id === params.institution_id);
  }
  if (params.lifecycle_status) {
    filtered = filtered.filter((f) => f.lifecycle_status === params.lifecycle_status);
  }
  if (params.trust_tier) {
    filtered = filtered.filter((f) => f.trust_tier === Number(params.trust_tier));
  }
  if (params.verification_status) {
    filtered = filtered.filter((f) => f.verification_status === params.verification_status);
  }
  if (params.region_id) {
    filtered = filtered.filter((f) => f.region_id === params.region_id || f.branch?.region_id === params.region_id);
  }

  const page = params.page || 1;
  const pageSize = params.page_size || 10;
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return { items, total, page, page_size: pageSize };
}

export async function fetchFDRById(id: string): Promise<FDR> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/fdrs/${id}`, {
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Backend offline, fallback to local store below
  }

  const allFdrs = getLocalOrInit(STORAGE_KEYS.FDRS, SEED_FDRS);
  const found = allFdrs.find((f) => f.id === id);
  if (!found) throw new Error(`FDR record with ID '${id}' was not found.`);

  const banks = getLocalOrInit(STORAGE_KEYS.BANKS, SEED_BANKS);
  const branches = getLocalOrInit(STORAGE_KEYS.BRANCHES, SEED_BRANCHES);
  const institutions = getLocalOrInit(STORAGE_KEYS.INSTITUTIONS, SEED_INSTITUTIONS);
  const regions = getLocalOrInit(STORAGE_KEYS.REGIONS, SEED_REGIONS);

  const bank = banks.find((b) => b.id === found.bank_id);
  const branch = branches.find((br) => br.id === found.branch_id);
  const inst = institutions.find((i) => i.id === found.institution_id);
  const reg = regions.find((r) => r.id === (found.region_id || branch?.region_id || inst?.region_id));

  return {
    ...found,
    bank,
    bank_name: found.bank_name || bank?.name,
    bank_code: found.bank_code || bank?.code,
    branch,
    branch_name: found.branch_name || branch?.branch_name,
    ifsc_code: found.ifsc_code || branch?.ifsc_code,
    institution: inst,
    institution_name: found.institution_name || inst?.name,
    institution_code: found.institution_code || inst?.code,
    region: reg,
    region_name: found.region_name || reg?.name,
    documents: found.documents || [],
    events: found.events || [],
  };
}

export async function createFDR(fdrData: {
  bank_id: string;
  branch_id: string;
  fdr_number: string;
  amount: number;
  issue_date: string;
  maturity_date: string;
  interest_rate?: number;
  lien_in_favour: string;
  remarks?: string;
  institution_id?: string;
}): Promise<FDR> {
  // Client-side validations
  if (Number(fdrData.amount) <= 0) {
    throw new Error('FDR Amount must be greater than zero.');
  }
  if (new Date(fdrData.maturity_date) <= new Date(fdrData.issue_date)) {
    throw new Error('Maturity date must strictly be after the issue date.');
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/fdrs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(fdrData),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    if (res.status === 400 || res.status === 409 || res.status === 422) {
      throw new Error(err.detail || 'Validation error registering FDR.');
    }
  } catch (error: any) {
    if (error.message && !error.message.includes('fetch')) {
      throw error;
    }
    // Fallback if backend offline
  }

  // Local fallback
  const allFdrs = getLocalOrInit(STORAGE_KEYS.FDRS, SEED_FDRS);
  if (allFdrs.some((f) => f.bank_id === fdrData.bank_id && f.fdr_number.toLowerCase() === fdrData.fdr_number.toLowerCase())) {
    throw new Error(`An FDR with number '${fdrData.fdr_number}' is already registered for this bank.`);
  }

  const institutions = getLocalOrInit(STORAGE_KEYS.INSTITUTIONS, SEED_INSTITUTIONS);
  const banks = getLocalOrInit(STORAGE_KEYS.BANKS, SEED_BANKS);
  const branches = getLocalOrInit(STORAGE_KEYS.BRANCHES, SEED_BRANCHES);

  const inst = institutions.find((i) => i.id === fdrData.institution_id) || institutions[0];
  const bank = banks.find((b) => b.id === fdrData.bank_id);
  const branch = branches.find((br) => br.id === fdrData.branch_id);

  const newId = `fdr-${Date.now()}`;
  const now = new Date().toISOString();

  const newFDR: FDR = {
    id: newId,
    institution_id: inst?.id || 'inst-01',
    institution_name: inst?.name,
    institution_code: inst?.code,
    bank_id: fdrData.bank_id,
    bank_name: bank?.name,
    bank_code: bank?.code,
    branch_id: fdrData.branch_id,
    branch_name: branch?.branch_name,
    ifsc_code: branch?.ifsc_code,
    region_id: branch?.region_id || inst?.region_id,
    fdr_number: fdrData.fdr_number.trim(),
    amount: Number(fdrData.amount),
    currency: 'INR',
    issue_date: fdrData.issue_date,
    maturity_date: fdrData.maturity_date,
    interest_rate: fdrData.interest_rate ? Number(fdrData.interest_rate) : undefined,
    lien_in_favour: fdrData.lien_in_favour.trim(),
    // Phase 2 Invariants: Strictly Tier 1, Pending, Institution Declared
    lifecycle_status: 'pending',
    trust_tier: 1,
    verification_status: 'institution_declared',
    heartbeat_status: 'not_started',
    remarks: fdrData.remarks?.trim(),
    created_at: now,
    updated_at: now,
    documents: [],
    events: [
      {
        id: `evt-${Date.now()}`,
        fdr_id: newId,
        institution_id: inst?.id || 'inst-01',
        event_type: 'fdr_registered',
        description: 'FDR record registered by depositor officer. Initial status: Pending (Trust Tier 1 - Institution Declared).',
        metadata: {
          trust_tier: 1,
          verification_status: 'institution_declared',
          initial_amount: Number(fdrData.amount),
        },
        created_at: now,
      },
    ],
  };

  saveLocal(STORAGE_KEYS.FDRS, [newFDR, ...allFdrs]);
  return newFDR;
}

export async function updateFDR(
  id: string,
  updates: {
    amount?: number;
    issue_date?: string;
    maturity_date?: string;
    interest_rate?: number;
    lien_in_favour?: string;
    remarks?: string;
  }
): Promise<FDR> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/fdrs/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update FDR.');
  } catch (error: any) {
    if (error.message && !error.message.includes('fetch')) {
      throw error;
    }
    // Fallback if backend offline
  }

  // Local fallback
  const allFdrs = getLocalOrInit(STORAGE_KEYS.FDRS, SEED_FDRS);
  const idx = allFdrs.findIndex((f) => f.id === id);
  if (idx === -1) throw new Error('FDR not found.');

  const existing = allFdrs[idx];
  if (existing.lifecycle_status !== 'pending') {
    throw new Error(`Cannot update FDR with status '${existing.lifecycle_status}'. Only 'pending' FDRs can be modified.`);
  }

  const issueDate = updates.issue_date || existing.issue_date;
  const maturityDate = updates.maturity_date || existing.maturity_date;
  if (new Date(maturityDate) <= new Date(issueDate)) {
    throw new Error('Maturity date must strictly be after the issue date.');
  }

  const now = new Date().toISOString();
  const updatedFDR: FDR = {
    ...existing,
    ...updates,
    updated_at: now,
    events: [
      ...(existing.events || []),
      {
        id: `evt-${Date.now()}`,
        fdr_id: id,
        institution_id: existing.institution_id,
        event_type: 'fdr_updated',
        description: 'FDR record updated during pending inspection state.',
        metadata: updates,
        created_at: now,
      },
    ],
  };

  allFdrs[idx] = updatedFDR;
  saveLocal(STORAGE_KEYS.FDRS, allFdrs);
  return updatedFDR;
}

export async function uploadFDRDocument(
  fdrId: string,
  file: File,
  documentType: DocumentType,
  description?: string
): Promise<FDRDocument> {
  // Validate file size limit: 10MB
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error(`File size ${(file.size / (1024 * 1024)).toFixed(2)} MB exceeds maximum limit of 10 MB.`);
  }

  const checksum = await computeSha256(file);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', documentType);
  if (description) formData.append('description', description);

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/fdrs/${fdrId}/documents`, {
      method: 'POST',
      headers: { ...headers },
      body: formData,
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to upload document.');
  } catch (error: any) {
    if (error.message && !error.message.includes('fetch')) {
      throw error;
    }
    // Fallback if backend offline
  }

  // Local fallback
  const allFdrs = getLocalOrInit(STORAGE_KEYS.FDRS, SEED_FDRS);
  const fdr = allFdrs.find((f) => f.id === fdrId);
  if (!fdr) throw new Error('FDR not found.');

  const docId = `doc-${Date.now()}`;
  const now = new Date().toISOString();
  // Create object URL for client preview
  const blobUrl = URL.createObjectURL(file);

  const newDoc: FDRDocument = {
    id: docId,
    fdr_id: fdrId,
    institution_id: fdr.institution_id,
    document_type: documentType,
    original_filename: file.name,
    storage_path: `${fdr.institution_id}/${fdrId}/${docId}/${file.name}`,
    mime_type: file.type || 'application/pdf',
    file_size_bytes: file.size,
    sha256_checksum: checksum,
    description: description || undefined,
    uploaded_at: now,
    is_active: true,
    download_url: blobUrl,
  };

  const newEvent: FDREvent = {
    id: `evt-${Date.now()}`,
    fdr_id: fdrId,
    institution_id: fdr.institution_id,
    event_type: 'fdr_document_uploaded',
    description: `Uploaded document: ${file.name} (${documentType}) with SHA-256 verified.`,
    metadata: {
      document_id: docId,
      filename: file.name,
      sha256: checksum,
      file_size_bytes: file.size,
    },
    created_at: now,
  };

  fdr.documents = [newDoc, ...(fdr.documents || [])];
  fdr.events = [newEvent, ...(fdr.events || [])];
  fdr.updated_at = now;

  saveLocal(STORAGE_KEYS.FDRS, allFdrs);
  return newDoc;
}

export async function downloadDocument(
  documentId: string
): Promise<{ download_url: string; filename: string }> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/documents/${documentId}/download`, {
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Backend offline, fallback to local store below
  }

  // Local fallback
  const allFdrs = getLocalOrInit(STORAGE_KEYS.FDRS, SEED_FDRS);
  for (const f of allFdrs) {
    const doc = (f.documents || []).find((d) => d.id === documentId);
    if (doc) {
      return {
        download_url: doc.download_url || '#',
        filename: doc.original_filename,
      };
    }
  }
  throw new Error('Document not found.');
}

export async function fetchFDREvents(fdrId: string): Promise<FDREvent[]> {
  const fdr = await fetchFDRById(fdrId);
  return fdr.events || [];
}

export async function fetchFDRStats(): Promise<FDRSummaryStats> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/fdrs/stats`, {
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Backend offline, fallback below
  }

  // Local aggregate calculations
  const allFdrs = getLocalOrInit(STORAGE_KEYS.FDRS, SEED_FDRS);
  const now = new Date();
  const d30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const d90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  let totalAmount = 0;
  let pendingCount = 0;
  let activeCount = 0;
  let tier1Count = 0;
  let upcoming30 = 0;
  let upcoming90 = 0;

  for (const f of allFdrs) {
    totalAmount += Number(f.amount) || 0;
    if (f.lifecycle_status === 'pending') pendingCount++;
    if (f.lifecycle_status === 'active') activeCount++;
    if (f.trust_tier === 1) tier1Count++;

    const mDate = new Date(f.maturity_date);
    if (mDate >= now && mDate <= d30) upcoming30++;
    if (mDate >= now && mDate <= d90) upcoming90++;
  }

  return {
    total_fdrs: allFdrs.length,
    total_amount: totalAmount,
    pending_count: pendingCount,
    active_count: activeCount,
    tier1_count: tier1Count,
    upcoming_maturity_30d: upcoming30,
    upcoming_maturity_90d: upcoming90,
  };
}

// ==============================================================================
// 6. PHASE 3: DIGITAL BANK VERIFICATION, TRUST TIERS & ED25519 SIGNATURES
// ==============================================================================

export async function createVerificationRequest(
  fdrIdOrParams: string | { fdr_id: string; recipient_email?: string; request_notes?: string }
): Promise<VerificationRequest> {
  const fdrId = typeof fdrIdOrParams === 'string' ? fdrIdOrParams : fdrIdOrParams.fdr_id;
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/fdrs/${fdrId}/verification-requests`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => ({}));
    if (res.status === 400 && errData.detail) {
      throw new Error(errData.detail);
    }
  } catch (err: any) {
    if (err.message && err.message.includes('already outstanding')) {
      throw err;
    }
  }

  // Local fallback
  const requests = getLocalOrInit(STORAGE_KEYS.VERIFICATION_REQUESTS, SEED_VERIFICATION_REQUESTS);
  const fdrs = getLocalOrInit(STORAGE_KEYS.FDRS, SEED_FDRS);
  const fdr = fdrs.find((f) => f.id === fdrId);
  if (!fdr) throw new Error('FDR not found');

  const existing = requests.find((r) => r.fdr_id === fdrId && r.status === 'pending');
  if (existing) {
    throw new Error('A pending verification request is already outstanding for this FDR.');
  }

  const rawToken = `token-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  const newReq: VerificationRequest = {
    id: `vreq-${Date.now()}`,
    fdr_id: fdrId,
    institution_id: fdr.institution_id,
    bank_id: fdr.bank_id,
    status: 'pending',
    fdr_snapshot: {
      fdr_number: fdr.fdr_number,
      amount: String(fdr.amount),
      currency: fdr.currency,
      issue_date: fdr.issue_date,
      maturity_date: fdr.maturity_date,
      lien_in_favour: fdr.lien_in_favour,
    },
    expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    created_by: 'current-user',
    created_at: new Date().toISOString(),
    raw_token: rawToken,
    verification_url: `/bank/verify/${rawToken}`,
  };

  saveLocal(STORAGE_KEYS.VERIFICATION_REQUESTS, [newReq, ...requests]);
  return newReq;
}

export async function getVerificationDetails(tokenOrId: string): Promise<any> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const res = await fetch(`${apiUrl}/api/v1/bank/verification/${tokenOrId}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall through to local fallback
  }

  const requests = getLocalOrInit(STORAGE_KEYS.VERIFICATION_REQUESTS, SEED_VERIFICATION_REQUESTS);
  const req = requests.find((r) => r.raw_token === tokenOrId || r.id === tokenOrId);
  if (!req) {
    throw new Error('Verification request not found or invalid token.');
  }

  const fdrs = getLocalOrInit(STORAGE_KEYS.FDRS, SEED_FDRS);
  const fdr = fdrs.find((f) => f.id === req.fdr_id);
  if (!fdr) throw new Error('FDR not found');

  const isExpired = new Date() > new Date(req.expires_at);

  return {
    request_id: req.id,
    fdr_id: fdr.id,
    fdr_number: fdr.fdr_number,
    institution_id: fdr.institution_id,
    institution_name: fdr.institution_name,
    bank_id: fdr.bank_id,
    bank_name: fdr.bank_name,
    branch_id: fdr.branch_id,
    branch_name: fdr.branch_name,
    ifsc_code: fdr.ifsc_code,
    amount: fdr.amount,
    currency: fdr.currency,
    issue_date: fdr.issue_date,
    maturity_date: fdr.maturity_date,
    interest_rate: fdr.interest_rate,
    lien_in_favour: fdr.lien_in_favour,
    status: req.status,
    expires_at: req.expires_at,
    is_expired: isExpired,
    is_snapshot_valid: true,
  };
}

export async function confirmBankVerification(params: {
  token: string;
  action: 'confirm' | 'reject';
  rejection_reason?: string;
  officer_name?: string;
  notes?: string;
}): Promise<any> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/bank/verification/confirm`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    if (err.detail) throw new Error(err.detail);
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) {
      throw err;
    }
  }

  // Local fallback
  const requests = getLocalOrInit(STORAGE_KEYS.VERIFICATION_REQUESTS, SEED_VERIFICATION_REQUESTS);
  const reqIndex = requests.findIndex((r) => r.raw_token === params.token);
  if (reqIndex === -1) throw new Error('Verification token not recognized or already consumed.');

  const targetReq = requests[reqIndex];
  if (targetReq.status !== 'pending') throw new Error(`Token is already ${targetReq.status}.`);

  targetReq.status = 'consumed';
  targetReq.consumed_at = new Date().toISOString();
  saveLocal(STORAGE_KEYS.VERIFICATION_REQUESTS, requests);

  // Update FDR trust tier
  const fdrs = getLocalOrInit(STORAGE_KEYS.FDRS, SEED_FDRS);
  const fdr = fdrs.find((f) => f.id === targetReq.fdr_id);
  const attestationId = `attest-t2-${Date.now()}`;

  if (fdr) {
    if (params.action === 'confirm') {
      fdr.trust_tier = 2;
      fdr.verification_status = 'bank_confirmed';
    } else {
      fdr.verification_status = 'rejected';
    }
    saveLocal(STORAGE_KEYS.FDRS, fdrs);
  }

  // Create attestation
  const attestations = getLocalOrInit(STORAGE_KEYS.ATTESTATIONS, SEED_ATTESTATIONS);
  const newAttestation: BankAttestation = {
    id: attestationId,
    fdr_id: targetReq.fdr_id,
    institution_id: targetReq.institution_id,
    bank_id: targetReq.bank_id,
    attestation_type: 'tier2_bank_confirmation',
    trust_tier: (params.action === 'confirm' ? 2 : 1) as any,
    verification_status: params.action === 'confirm' ? 'bank_confirmed' : 'rejected',
    request_id: targetReq.id,
    attested_by: 'bank-nodal-officer',
    attestation_metadata: {
      officer_name: params.officer_name || 'Bank Nodal Officer',
      notes: params.notes || (params.action === 'confirm' ? 'Confirmed by Bank Officer' : params.rejection_reason),
    },
    created_at: new Date().toISOString(),
  };

  saveLocal(STORAGE_KEYS.ATTESTATIONS, [newAttestation, ...attestations]);
  return {
    success: true,
    action: params.action === 'confirm' ? 'confirmed' : 'rejected',
    trust_tier: params.action === 'confirm' ? 2 : 1,
    verification_status: params.action === 'confirm' ? 'bank_confirmed' : 'rejected',
    attestation_id: attestationId,
    message: params.action === 'confirm' ? 'FDR promoted to Trust Tier 2 (Bank Confirmed)' : 'FDR verification rejected',
  };
}

export async function listBankPendingRequests(bankId?: string): Promise<VerificationRequest[]> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const query = bankId ? `?bank_id=${bankId}` : '';
    const res = await fetch(`${apiUrl}/api/v1/bank/pending-requests${query}`, {
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall through to local fallback
  }

  const requests = getLocalOrInit(STORAGE_KEYS.VERIFICATION_REQUESTS, SEED_VERIFICATION_REQUESTS);
  return requests.filter((r) => r.status === 'pending' && (!bankId || r.bank_id === bankId));
}

export async function fetchFDRAttestations(fdrId: string): Promise<BankAttestation[]> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/fdrs/${fdrId}/attestations`, {
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall through to local fallback
  }

  const attestations = getLocalOrInit(STORAGE_KEYS.ATTESTATIONS, SEED_ATTESTATIONS);
  return attestations.filter((a) => a.fdr_id === fdrId);
}

export async function submitDigitalSignature(
  fdrId: string,
  signedPayload: any,
  signatureHex: string
): Promise<any> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/bank/attestations`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fdr_id: fdrId,
        signed_payload: signedPayload,
        signature_hex: signatureHex,
      }),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    if (err.detail) throw new Error(err.detail);
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) {
      throw err;
    }
  }

  // Local fallback
  const fdrs = getLocalOrInit(STORAGE_KEYS.FDRS, SEED_FDRS);
  const fdr = fdrs.find((f) => f.id === fdrId);
  if (!fdr) throw new Error('FDR not found');

  fdr.trust_tier = 3;
  fdr.verification_status = 'signature_verified';
  saveLocal(STORAGE_KEYS.FDRS, fdrs);

  const attestationId = `attest-t3-${Date.now()}`;
  const attestations = getLocalOrInit(STORAGE_KEYS.ATTESTATIONS, SEED_ATTESTATIONS);
  const newAtt: BankAttestation = {
    id: attestationId,
    fdr_id: fdrId,
    institution_id: fdr.institution_id,
    bank_id: fdr.bank_id,
    branch_id: fdr.branch_id,
    attestation_type: 'tier3_digital_signature',
    trust_tier: 3,
    verification_status: 'signature_verified',
    key_id: signedPayload.key_id,
    signature_hex: signatureHex,
    nonce: signedPayload.nonce,
    attested_by: 'bank-digital-gateway',
    attestation_metadata: {
      algorithm: 'Ed25519',
      issuer: signedPayload.issuer,
      key_id: signedPayload.key_id,
      verified_at: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
  };

  saveLocal(STORAGE_KEYS.ATTESTATIONS, [newAtt, ...attestations]);
  return {
    success: true,
    attestation_id: attestationId,
    trust_tier: 3,
    verification_status: 'signature_verified',
    key_id: signedPayload.key_id,
    message: `FDR ${fdr.fdr_number} successfully promoted to Trust Tier 3 (Signature Verified).`,
  };
}

export async function mockBankSignFDR(fdrId: string): Promise<{
  fdr_id: string;
  bank_code: string;
  signed_payload: any;
  signature_hex: string;
}> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const headers = await getAuthHeaders();
  const res = await fetch(`${apiUrl}/api/v1/bank/mock-sign/${fdrId}`, {
    method: 'POST',
    headers: { ...headers },
  });
  if (res.ok) {
    return await res.json();
  }
  const err = await res.json().catch(() => ({}));
  throw new Error(err.detail || 'Failed to generate mock bank signature.');
}

export async function fetchBankKeys(bankId?: string, isActive?: boolean): Promise<BankKey[]> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    let query = '';
    const params: string[] = [];
    if (bankId) params.push(`bank_id=${bankId}`);
    if (isActive !== undefined) params.push(`is_active=${isActive}`);
    if (params.length > 0) query = `?${params.join('&')}`;

    const res = await fetch(`${apiUrl}/api/v1/admin/bank-keys${query}`, {
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall through to local fallback
  }

  const keys = getLocalOrInit(STORAGE_KEYS.BANK_KEYS, SEED_BANK_KEYS);
  return keys.filter(
    (k) => (!bankId || k.bank_id === bankId) && (isActive === undefined || k.is_active === isActive)
  );
}

export async function registerBankKey(keyData: {
  bank_id: string;
  key_id: string;
  algorithm: string;
  public_key_pem: string;
  valid_until: string;
}): Promise<BankKey> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/admin/bank-keys`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(keyData),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    if (err.detail) throw new Error(err.detail);
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) throw err;
  }

  // Local fallback
  const keys = getLocalOrInit(STORAGE_KEYS.BANK_KEYS, SEED_BANK_KEYS);
  const newKey: BankKey = {
    id: `key-${Date.now()}`,
    bank_id: keyData.bank_id,
    bank_name: 'Commercial Bank',
    key_id: keyData.key_id,
    algorithm: keyData.algorithm,
    public_key_pem: keyData.public_key_pem,
    public_key_raw_hex: '4ae45b402bc3a4c1f5083e9622dd20a19706606bd3ff01eba0849b9160a601b7',
    valid_from: new Date().toISOString(),
    valid_until: keyData.valid_until,
    is_active: true,
    is_revoked: false,
    created_at: new Date().toISOString(),
  };

  saveLocal(STORAGE_KEYS.BANK_KEYS, [newKey, ...keys]);
  return newKey;
}

export async function revokeBankKey(keyId: string, revocationReason: string): Promise<BankKey> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/admin/bank-keys/${keyId}/revoke`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ revocation_reason: revocationReason }),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    if (err.detail) throw new Error(err.detail);
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) throw err;
  }

  // Local fallback
  const keys = getLocalOrInit(STORAGE_KEYS.BANK_KEYS, SEED_BANK_KEYS);
  const key = keys.find((k) => k.key_id === keyId || k.id === keyId);
  if (!key) throw new Error('Key not found');

  key.is_active = false;
  key.is_revoked = true;
  key.revoked_at = new Date().toISOString();
  key.revocation_reason = revocationReason;
  saveLocal(STORAGE_KEYS.BANK_KEYS, keys);
  return key;
}

// ==============================================================================
// 7. PHASE 4: PERIODIC HEARTBEAT VERIFICATION, POLICIES & ALERT DESK
// ==============================================================================

export async function fetchHeartbeatDashboard(): Promise<HeartbeatDashboardStats> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/heartbeat/dashboard`, {
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    // Fallback to local
  }

  // Local fallback
  const fdrs = getLocalOrInit(STORAGE_KEYS.FDRS, SEED_FDRS);
  const checks = getLocalOrInit(STORAGE_KEYS.HEARTBEAT_CHECKS, SEED_HEARTBEAT_CHECKS);
  const alerts = getLocalOrInit(STORAGE_KEYS.FDR_ALERTS, SEED_FDR_ALERTS);

  let alive = 0;
  let stale = 0;
  let broken = 0;
  let unresponsive = 0;
  let notStarted = 0;

  for (const f of fdrs) {
    const status = f.heartbeat_status || 'not_started';
    if (status === 'alive') alive++;
    else if (status === 'stale') stale++;
    else if (status === 'broken') broken++;
    else if (status === 'unresponsive') unresponsive++;
    else notStarted++;
  }

  const activeAlerts = alerts.filter((a) => !a.is_resolved);
  const criticalAlerts = activeAlerts.filter((a) => a.severity === 'critical');
  const pendingChecks = checks.filter((c) => c.check_status === 'scheduled' || c.check_status === 'requested');

  const complianceRate = fdrs.length > 0 ? Math.round((alive / fdrs.length) * 100) : 100;

  return {
    total_monitored_fdrs: fdrs.length,
    alive_count: alive,
    stale_count: stale,
    broken_count: broken,
    unresponsive_count: unresponsive,
    not_started_count: notStarted,
    total_checks_count: checks.length,
    pending_checks_count: pendingChecks.length,
    active_alerts_count: activeAlerts.length,
    critical_alerts_count: criticalAlerts.length,
    upcoming_maturities_30d: 1,
    compliance_rate_percent: complianceRate,
  };
}

export async function fetchMonitoredFDRs(params: {
  heartbeat_status?: string;
  search?: string;
  page?: number;
  page_size?: number;
} = {}): Promise<{ items: FDR[]; total: number; page: number; page_size: number }> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const query = new URLSearchParams();
  if (params.heartbeat_status) query.set('heartbeat_status', params.heartbeat_status);
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/heartbeat/fdrs?${query.toString()}`, {
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  const fdrs = getLocalOrInit(STORAGE_KEYS.FDRS, SEED_FDRS);
  let filtered = [...fdrs];

  if (params.heartbeat_status) {
    filtered = filtered.filter((f) => (f.heartbeat_status || 'not_started') === params.heartbeat_status);
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (f) =>
        f.fdr_number.toLowerCase().includes(q) ||
        (f.bank_name && f.bank_name.toLowerCase().includes(q)) ||
        (f.institution_name && f.institution_name.toLowerCase().includes(q))
    );
  }

  const page = params.page || 1;
  const pageSize = params.page_size || 10;
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  return {
    items: paged,
    total: filtered.length,
    page,
    page_size: pageSize,
  };
}

export async function fetchFDRHeartbeatDetails(fdrId: string): Promise<any> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/fdrs/${fdrId}/heartbeat`, {
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  const fdr = await fetchFDRById(fdrId);
  const checks = getLocalOrInit(STORAGE_KEYS.HEARTBEAT_CHECKS, SEED_HEARTBEAT_CHECKS).filter(
    (c) => c.fdr_id === fdrId
  );
  const policies = getLocalOrInit(STORAGE_KEYS.HEARTBEAT_POLICIES, SEED_HEARTBEAT_POLICIES);

  return {
    fdr,
    active_policy: policies[0] || null,
    latest_check: checks[0] || null,
    total_checks: checks.length,
  };
}

export async function fetchFDRHeartbeatHistory(fdrId: string): Promise<HeartbeatCheck[]> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/fdrs/${fdrId}/heartbeat/history`, {
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  const checks = getLocalOrInit(STORAGE_KEYS.HEARTBEAT_CHECKS, SEED_HEARTBEAT_CHECKS);
  return checks.filter((c) => c.fdr_id === fdrId);
}

export async function triggerManualHeartbeatCheck(
  fdrId: string,
  notes?: string
): Promise<HeartbeatCheck> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/fdrs/${fdrId}/heartbeat/request`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    if (err.detail) throw new Error(err.detail);
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) throw err;
  }

  // Local fallback
  const checks = getLocalOrInit(STORAGE_KEYS.HEARTBEAT_CHECKS, SEED_HEARTBEAT_CHECKS);
  const fdrs = getLocalOrInit(STORAGE_KEYS.FDRS, SEED_FDRS);
  const fdr = fdrs.find((f) => f.id === fdrId);
  if (!fdr) throw new Error('FDR not found');

  const now = new Date().toISOString();
  const newCheck: HeartbeatCheck = {
    id: `chk-${Date.now()}`,
    fdr_id: fdrId,
    fdr_number: fdr.fdr_number,
    bank_name: fdr.bank_name,
    institution_name: fdr.institution_name,
    policy_id: 'pol-01',
    scheduled_at: now,
    requested_at: now,
    check_status: 'requested',
    retry_count: 0,
    notes: notes || 'Manual heartbeat check requested by administrator',
    created_at: now,
    updated_at: now,
  };

  saveLocal(STORAGE_KEYS.HEARTBEAT_CHECKS, [newCheck, ...checks]);
  return newCheck;
}

export async function fetchHeartbeatPolicies(): Promise<HeartbeatPolicy[]> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/admin/heartbeat-policies`, {
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return getLocalOrInit(STORAGE_KEYS.HEARTBEAT_POLICIES, SEED_HEARTBEAT_POLICIES);
}

export async function createHeartbeatPolicy(
  policyData: Partial<HeartbeatPolicy>
): Promise<HeartbeatPolicy> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/admin/heartbeat-policies`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(policyData),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    if (err.detail) throw new Error(err.detail);
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) throw err;
  }

  // Local fallback
  const policies = getLocalOrInit(STORAGE_KEYS.HEARTBEAT_POLICIES, SEED_HEARTBEAT_POLICIES);
  const now = new Date().toISOString();
  const newPol: HeartbeatPolicy = {
    id: `pol-${Date.now()}`,
    name: policyData.name || 'New Policy',
    description: policyData.description,
    is_default: !!policyData.is_default,
    min_amount: policyData.min_amount,
    max_amount: policyData.max_amount,
    frequency_days: policyData.frequency_days || 14,
    response_timeout_hours: policyData.response_timeout_hours || 48,
    max_retries: policyData.max_retries || 3,
    retry_interval_hours: policyData.retry_interval_hours || 24,
    stale_threshold_days: policyData.stale_threshold_days || 21,
    is_active: policyData.is_active !== false,
    created_at: now,
    updated_at: now,
  };

  saveLocal(STORAGE_KEYS.HEARTBEAT_POLICIES, [...policies, newPol]);
  return newPol;
}

export async function updateHeartbeatPolicy(
  policyId: string,
  policyData: Partial<HeartbeatPolicy>
): Promise<HeartbeatPolicy> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/admin/heartbeat-policies/${policyId}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(policyData),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    if (err.detail) throw new Error(err.detail);
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) throw err;
  }

  // Local fallback
  const policies = getLocalOrInit(STORAGE_KEYS.HEARTBEAT_POLICIES, SEED_HEARTBEAT_POLICIES);
  const idx = policies.findIndex((p) => p.id === policyId);
  if (idx === -1) throw new Error('Policy not found');

  const updated: HeartbeatPolicy = {
    ...policies[idx],
    ...policyData,
    updated_at: new Date().toISOString(),
  };
  policies[idx] = updated;
  saveLocal(STORAGE_KEYS.HEARTBEAT_POLICIES, policies);
  return updated;
}

export async function fetchAlerts(params: {
  is_resolved?: boolean;
  severity?: string;
  alert_type?: string;
  fdr_id?: string;
  page?: number;
  page_size?: number;
} = {}): Promise<{ items: FDRAlert[]; total: number; unread_count: number; page: number; page_size: number }> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const query = new URLSearchParams();
  if (params.is_resolved !== undefined) query.set('is_resolved', String(params.is_resolved));
  if (params.severity) query.set('severity', params.severity);
  if (params.alert_type) query.set('alert_type', params.alert_type);
  if (params.fdr_id) query.set('fdr_id', params.fdr_id);
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/alerts?${query.toString()}`, {
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  const alerts = getLocalOrInit(STORAGE_KEYS.FDR_ALERTS, SEED_FDR_ALERTS);
  let filtered = [...alerts];

  if (params.is_resolved !== undefined) {
    filtered = filtered.filter((a) => a.is_resolved === params.is_resolved);
  }
  if (params.severity) {
    filtered = filtered.filter((a) => a.severity === params.severity);
  }
  if (params.alert_type) {
    filtered = filtered.filter((a) => a.alert_type === params.alert_type);
  }
  if (params.fdr_id) {
    filtered = filtered.filter((a) => a.fdr_id === params.fdr_id);
  }

  const unreadCount = alerts.filter((a) => !a.is_read && !a.is_resolved).length;
  const page = params.page || 1;
  const pageSize = params.page_size || 20;
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  return {
    items: paged,
    total: filtered.length,
    unread_count: unreadCount,
    page,
    page_size: pageSize,
  };
}

export async function markAlertAsRead(alertId: string): Promise<FDRAlert> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/alerts/${alertId}/read`, {
      method: 'PATCH',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  const alerts = getLocalOrInit(STORAGE_KEYS.FDR_ALERTS, SEED_FDR_ALERTS);
  const item = alerts.find((a) => a.id === alertId);
  if (!item) throw new Error('Alert not found');
  item.is_read = true;
  saveLocal(STORAGE_KEYS.FDR_ALERTS, alerts);
  return item;
}

export async function assignAlert(alertId: string, userId: string): Promise<FDRAlert> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/alerts/${alertId}/assign`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  const alerts = getLocalOrInit(STORAGE_KEYS.FDR_ALERTS, SEED_FDR_ALERTS);
  const item = alerts.find((a) => a.id === alertId);
  if (!item) throw new Error('Alert not found');
  item.assigned_to = userId;
  item.assigned_to_name = 'Assigned Officer';
  saveLocal(STORAGE_KEYS.FDR_ALERTS, alerts);
  return item;
}

export async function resolveAlert(alertId: string, resolutionNotes: string): Promise<FDRAlert> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/alerts/${alertId}/resolve`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution_notes: resolutionNotes }),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    if (err.detail) throw new Error(err.detail);
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) throw err;
  }

  const alerts = getLocalOrInit(STORAGE_KEYS.FDR_ALERTS, SEED_FDR_ALERTS);
  const item = alerts.find((a) => a.id === alertId);
  if (!item) throw new Error('Alert not found');
  item.is_resolved = true;
  item.resolved_at = new Date().toISOString();
  item.resolution_notes = resolutionNotes;
  saveLocal(STORAGE_KEYS.FDR_ALERTS, alerts);
  return item;
}

export async function triggerSchedulerCycle(): Promise<any> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/heartbeat/scheduler/run-cycle`, {
      method: 'POST',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return {
    status: 'success',
    message: 'Manual scheduler cycle simulated successfully.',
    timestamp: new Date().toISOString(),
  };
}

// ==============================================================================
// PHASE 5: RENEWAL MANAGEMENT & FDR LINEAGE API
// ==============================================================================

export async function fetchRenewalDashboardStats(): Promise<RenewalDashboardStats> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/renewals/dashboard/stats`, {
      method: 'GET',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // local fallback
  }

  const cases = getLocalOrInit(STORAGE_KEYS.RENEWAL_CASES, SEED_RENEWAL_CASES);
  return {
    total_cases: cases.length,
    draft_cases: cases.filter((c) => c.status === 'draft').length,
    submitted_cases: cases.filter((c) => c.status === 'submitted').length,
    awaiting_bank_confirmation: cases.filter((c) => c.status === 'awaiting_bank_confirmation').length,
    under_review_cases: cases.filter((c) => c.status === 'under_review').length,
    approved_cases: cases.filter((c) => c.status === 'approved').length,
    rejected_cases: cases.filter((c) => c.status === 'rejected').length,
    upcoming_maturities_30d: 1,
    pending_officer_review: cases.filter((c) => c.status === 'under_review' || c.status === 'submitted').length,
    recent_cases: cases.slice(0, 5),
  };
}

export async function fetchRenewalCases(params?: {
  status?: string;
  institution_id?: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<{ items: RenewalCase[]; total: number; page: number; page_size: number; total_pages: number }> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.institution_id) query.set('institution_id', params.institution_id);
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', params.page.toString());
  if (params?.page_size) query.set('page_size', params.page_size.toString());

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/renewals?${query.toString()}`, {
      method: 'GET',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // local fallback
  }

  let cases = getLocalOrInit(STORAGE_KEYS.RENEWAL_CASES, SEED_RENEWAL_CASES);
  const fdrs = getLocalOrInit(STORAGE_KEYS.FDRS, SEED_FDRS);

  if (params?.status) {
    cases = cases.filter((c) => c.status === params.status);
  }
  if (params?.institution_id) {
    cases = cases.filter((c) => c.institution_id === params.institution_id);
  }
  if (params?.search) {
    const s = params.search.toLowerCase();
    cases = cases.filter(
      (c) =>
        c.case_number?.toLowerCase().includes(s) ||
        c.submission_notes?.toLowerCase().includes(s) ||
        c.renewal_reference?.toLowerCase().includes(s)
    );
  }

  const page = params?.page || 1;
  const pageSize = params?.page_size || 10;
  const total = cases.length;
  const paginated = cases.slice((page - 1) * pageSize, page * pageSize).map((c) => ({
    ...c,
    original_fdr: fdrs.find((f) => f.id === c.original_fdr_id),
    proposed_replacement_fdr: fdrs.find((f) => f.id === (c.proposed_replacement_fdr_id || c.proposed_fdr_id)),
  }));

  return {
    items: paginated,
    total,
    page,
    page_size: pageSize,
    total_pages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function fetchRenewalCaseById(caseId: string): Promise<RenewalCase> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/renewals/${caseId}`, {
      method: 'GET',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    if (err.detail) throw new Error(err.detail);
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) throw err;
  }

  const cases = getLocalOrInit(STORAGE_KEYS.RENEWAL_CASES, SEED_RENEWAL_CASES);
  const item = cases.find((c) => c.id === caseId);
  if (!item) throw new Error(`Renewal case ${caseId} not found`);

  const fdrs = getLocalOrInit(STORAGE_KEYS.FDRS, SEED_FDRS);
  const evidence = getLocalOrInit(STORAGE_KEYS.RENEWAL_EVIDENCE, SEED_RENEWAL_EVIDENCE);

  return {
    ...item,
    original_fdr: fdrs.find((f) => f.id === item.original_fdr_id),
    proposed_replacement_fdr: fdrs.find((f) => f.id === (item.proposed_replacement_fdr_id || item.proposed_fdr_id)),
    evidence: evidence.filter((e) => e.renewal_case_id === caseId),
  };
}

export async function createRenewalCase(
  fdrId: string,
  payload: { proposed_replacement_fdr_id?: string; submission_notes?: string }
): Promise<RenewalCase> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/fdrs/${fdrId}/renewals`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    if (err.detail) throw new Error(err.detail);
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) throw err;
  }

  const cases = getLocalOrInit(STORAGE_KEYS.RENEWAL_CASES, SEED_RENEWAL_CASES);
  const fdrs = getLocalOrInit(STORAGE_KEYS.FDRS, SEED_FDRS);
  const orig = fdrs.find((f) => f.id === fdrId);
  if (!orig) throw new Error('Original FDR not found');

  const newCase: RenewalCase = {
    id: `case-${Date.now()}`,
    case_number: `RC-2026-${String(cases.length + 1).padStart(4, '0')}`,
    original_fdr_id: fdrId,
    parent_fdr_id: fdrId,
    proposed_replacement_fdr_id: payload.proposed_replacement_fdr_id,
    proposed_fdr_id: payload.proposed_replacement_fdr_id,
    institution_id: orig.institution_id,
    institution_name: orig.institution_name,
    bank_id: orig.bank_id,
    bank_name: orig.bank_name,
    status: 'draft',
    case_status: 'draft',
    submission_notes: payload.submission_notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  cases.unshift(newCase);
  saveLocal(STORAGE_KEYS.RENEWAL_CASES, cases);
  return newCase;
}

export async function updateRenewalCase(
  caseId: string,
  payload: { proposed_replacement_fdr_id?: string; submission_notes?: string }
): Promise<RenewalCase> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/renewals/${caseId}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    if (err.detail) throw new Error(err.detail);
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) throw err;
  }

  const cases = getLocalOrInit(STORAGE_KEYS.RENEWAL_CASES, SEED_RENEWAL_CASES);
  const item = cases.find((c) => c.id === caseId);
  if (!item) throw new Error('Renewal case not found');
  if (payload.proposed_replacement_fdr_id !== undefined) {
    item.proposed_replacement_fdr_id = payload.proposed_replacement_fdr_id;
  }
  if (payload.submission_notes !== undefined) {
    item.submission_notes = payload.submission_notes;
  }
  item.updated_at = new Date().toISOString();
  saveLocal(STORAGE_KEYS.RENEWAL_CASES, cases);
  return item;
}

export async function submitRenewalCase(
  caseId: string,
  payload?: { proposed_replacement_fdr_id?: string; submission_notes?: string }
): Promise<RenewalCase> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/renewals/${caseId}/submit`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    if (err.detail) throw new Error(err.detail);
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) throw err;
  }

  const cases = getLocalOrInit(STORAGE_KEYS.RENEWAL_CASES, SEED_RENEWAL_CASES);
  const item = cases.find((c) => c.id === caseId);
  if (!item) throw new Error('Renewal case not found');
  item.status = 'under_review';
  item.case_status = 'under_review';
  item.submitted_at = new Date().toISOString();
  item.updated_at = new Date().toISOString();
  saveLocal(STORAGE_KEYS.RENEWAL_CASES, cases);
  return item;
}

export async function runCandidateMatching(caseId: string, candidateId?: string): Promise<MatchingResult> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const query = candidateId ? `?candidate_id=${candidateId}` : '';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/renewals/${caseId}/match${query}`, {
      method: 'POST',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  return {
    evaluated_at: new Date().toISOString(),
    total_candidates_evaluated: 1,
    candidates: [
      {
        candidate_fdr_id: 'fdr-005',
        candidate_fdr_number: 'FDR-2027-NHAI-99411',
        bank_name: 'State Bank of India',
        branch_name: 'SBI New Delhi Main Branch',
        amount: 25000000,
        currency: 'INR',
        issue_date: '2027-01-15',
        maturity_date: '2028-01-15',
        trust_tier: 2,
        heartbeat_status: 'alive',
        score: 95.0,
        confidence_level: 'high',
        matching_factors: [
          'Exact Beneficiary Institution Match',
          'Exact Depository Bank Match',
          'Exact Branch Code Match',
          'Identical Principal Amount Match',
        ],
        mismatched_fields: [],
        explanation: 'Excellent candidate with identical beneficiary institution, bank, branch, and amount.',
      },
    ],
    advisory_notice:
      'Matching suggestions are advisory only and must never be interpreted as automatic approval or legal lineage.',
  };
}

export async function uploadRenewalEvidence(
  caseId: string,
  file: File,
  evidenceType: string,
  description?: string
): Promise<RenewalEvidence> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('evidence_type', evidenceType);
    if (description) formData.append('description', description);

    const res = await fetch(`${apiUrl}/api/v1/renewals/${caseId}/evidence`, {
      method: 'POST',
      headers: { Authorization: headers.Authorization },
      body: formData,
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    if (err.detail) throw new Error(err.detail);
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) throw err;
  }

  const evidence = getLocalOrInit(STORAGE_KEYS.RENEWAL_EVIDENCE, SEED_RENEWAL_EVIDENCE);
  const newEv: RenewalEvidence = {
    id: `ev-${Date.now()}`,
    renewal_case_id: caseId,
    evidence_type: evidenceType as any,
    file_name: file.name,
    file_path: `inst-01/renewals/${caseId}/${file.name}`,
    file_size_bytes: file.size,
    mime_type: file.type || 'application/pdf',
    sha256_checksum: 'a' + Math.random().toString(16).substring(2).padEnd(63, '0'),
    description: description || `Uploaded ${evidenceType}`,
    is_reviewed: false,
    created_at: new Date().toISOString(),
  };

  evidence.push(newEv);
  saveLocal(STORAGE_KEYS.RENEWAL_EVIDENCE, evidence);
  return newEv;
}

export async function approveRenewalCase(
  caseId: string,
  payload: { decision_notes: string; relationship_type?: string }
): Promise<any> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/renewals/${caseId}/approve`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    if (err.detail) throw new Error(err.detail);
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) throw err;
  }

  const cases = getLocalOrInit(STORAGE_KEYS.RENEWAL_CASES, SEED_RENEWAL_CASES);
  const fdrs = getLocalOrInit(STORAGE_KEYS.FDRS, SEED_FDRS);
  const item = cases.find((c) => c.id === caseId);
  if (!item) throw new Error('Renewal case not found');

  item.status = 'approved';
  item.case_status = 'approved';
  item.reviewed_at = new Date().toISOString();
  item.decision_notes = payload.decision_notes;
  saveLocal(STORAGE_KEYS.RENEWAL_CASES, cases);

  const orig = fdrs.find((f) => f.id === item.original_fdr_id);
  if (orig) {
    orig.lifecycle_status = 'renewed';
    saveLocal(STORAGE_KEYS.FDRS, fdrs);
  }

  return {
    success: true,
    case_id: caseId,
    case_number: item.case_number,
    status: 'approved',
    lineage_id: `lineage-${Date.now()}`,
    parent_fdr_id: item.original_fdr_id,
    child_fdr_id: item.proposed_replacement_fdr_id,
    message: 'Renewal case approved and lineage committed successfully.',
  };
}

export async function rejectRenewalCase(
  caseId: string,
  payload: { rejection_reason: string }
): Promise<RenewalCase> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/renewals/${caseId}/reject`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    if (err.detail) throw new Error(err.detail);
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) throw err;
  }

  const cases = getLocalOrInit(STORAGE_KEYS.RENEWAL_CASES, SEED_RENEWAL_CASES);
  const item = cases.find((c) => c.id === caseId);
  if (!item) throw new Error('Renewal case not found');

  item.status = 'rejected';
  item.case_status = 'rejected';
  item.reviewed_at = new Date().toISOString();
  item.decision_notes = `REJECTED: ${payload.rejection_reason}`;
  saveLocal(STORAGE_KEYS.RENEWAL_CASES, cases);
  return item;
}

export async function fetchFDRLineage(fdrId: string): Promise<FDRLineageGraph> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/fdrs/${fdrId}/lineage`, {
      method: 'GET',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const fdrs = getLocalOrInit(STORAGE_KEYS.FDRS, SEED_FDRS);
  const lineageEdges = getLocalOrInit(STORAGE_KEYS.FDR_LINEAGE, SEED_FDR_LINEAGE);

  const centerFdr = fdrs.find((f) => f.id === fdrId) || fdrs[0];
  const relevantEdges = lineageEdges.filter(
    (e) => e.parent_fdr_id === centerFdr.id || e.child_fdr_id === centerFdr.id
  );

  const connectedIds = new Set<string>([centerFdr.id]);
  relevantEdges.forEach((e) => {
    connectedIds.add(e.parent_fdr_id);
    connectedIds.add(e.child_fdr_id);
  });

  const nodes = Array.from(connectedIds)
    .map((id) => fdrs.find((f) => f.id === id))
    .filter(Boolean)
    .map((f, idx) => ({
      fdr_id: f!.id,
      id: f!.id,
      fdr_number: f!.fdr_number,
      institution_id: f!.institution_id,
      institution_name: f!.institution_name,
      bank_id: f!.bank_id,
      bank_name: f!.bank_name,
      branch_name: f!.branch_name,
      amount: f!.amount,
      currency: f!.currency || 'INR',
      issue_date: f!.issue_date,
      maturity_date: f!.maturity_date,
      lifecycle_status: f!.lifecycle_status,
      trust_tier: f!.trust_tier,
      verification_status: f!.verification_status,
      heartbeat_status: f!.heartbeat_status,
      is_current: f!.id === fdrId,
      generation_level: idx,
    }));

  return {
    root_fdr_id: nodes[0]?.fdr_id || fdrId,
    center_fdr_id: fdrId,
    total_nodes: nodes.length,
    total_edges: relevantEdges.length,
    nodes,
    edges: relevantEdges,
    has_cycles: false,
    is_leaf: relevantEdges.every((e) => e.parent_fdr_id !== fdrId),
  };
}

export async function fetchFDRRenewalCases(fdrId: string): Promise<{ items: RenewalCase[]; total: number }> {
  return fetchRenewalCases({ search: fdrId });
}

// ==============================================================================
// PHASE 6: OFFICER DASHBOARD & PRIORITY QUEUE API
// ==============================================================================

export async function fetchOfficerDashboardStats(): Promise<OfficerDashboardStats> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/officer/dashboard`, {
      method: 'GET',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return SEED_OFFICER_DASHBOARD_STATS;
}

export async function fetchOfficerTasks(params?: {
  status?: string;
  priority_level?: string;
  assigned_to?: string;
  task_type?: string;
  search?: string;
  my_tasks?: boolean;
  unassigned_only?: boolean;
  limit?: number;
  offset?: number;
}): Promise<OfficerTask[]> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.priority_level) query.set('priority_level', params.priority_level);
    if (params?.assigned_to) query.set('assigned_to', params.assigned_to);
    if (params?.task_type) query.set('task_type', params.task_type);
    if (params?.search) query.set('search', params.search);
    if (params?.my_tasks) query.set('my_tasks', 'true');
    if (params?.unassigned_only) query.set('unassigned_only', 'true');
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());

    const res = await fetch(`${apiUrl}/api/v1/officer/tasks?${query.toString()}`, {
      method: 'GET',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const tasks = getLocalOrInit(STORAGE_KEYS.OFFICER_TASKS, SEED_OFFICER_TASKS);
  let filtered = [...tasks];

  if (params?.status) {
    filtered = filtered.filter((t) => t.task_status === params.status);
  }
  if (params?.priority_level) {
    filtered = filtered.filter((t) => t.priority_level === params.priority_level);
  }
  if (params?.task_type) {
    filtered = filtered.filter((t) => t.task_type === params.task_type);
  }
  if (params?.assigned_to) {
    filtered = filtered.filter((t) => t.assigned_to === params.assigned_to);
  }
  if (params?.unassigned_only) {
    filtered = filtered.filter((t) => !t.assigned_to);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.fdr_number?.toLowerCase().includes(q) ||
        t.institution_name?.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => b.priority_score - a.priority_score);
  return filtered;
}

export async function fetchOfficerTaskById(id: string): Promise<OfficerTask> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/officer/tasks/${id}`, {
      method: 'GET',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const tasks = getLocalOrInit(STORAGE_KEYS.OFFICER_TASKS, SEED_OFFICER_TASKS);
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    throw new Error(`Task ${id} not found.`);
  }

  const comments = getLocalOrInit(STORAGE_KEYS.TASK_COMMENTS, SEED_TASK_COMMENTS).filter(
    (c) => c.task_id === id
  );
  const escalations = getLocalOrInit(STORAGE_KEYS.TASK_ESCALATIONS, SEED_TASK_ESCALATIONS).filter(
    (e) => e.task_id === id
  );

  return {
    ...task,
    comments,
    escalations,
    assignments: task.assignments || [],
  };
}

export async function startOfficerTask(id: string, note?: string): Promise<OfficerTask> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/officer/tasks/${id}/start`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const tasks = getLocalOrInit(STORAGE_KEYS.OFFICER_TASKS, SEED_OFFICER_TASKS);
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.task_status = 'in_progress';
    task.started_at = new Date().toISOString();
    task.updated_at = new Date().toISOString();
    saveLocal(STORAGE_KEYS.OFFICER_TASKS, tasks);
    return task;
  }
  throw new Error(`Task ${id} not found.`);
}

export async function waitOfficerTask(id: string, reason: string): Promise<OfficerTask> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/officer/tasks/${id}/wait`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const tasks = getLocalOrInit(STORAGE_KEYS.OFFICER_TASKS, SEED_OFFICER_TASKS);
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.task_status = 'waiting';
    task.updated_at = new Date().toISOString();
    saveLocal(STORAGE_KEYS.OFFICER_TASKS, tasks);
    return task;
  }
  throw new Error(`Task ${id} not found.`);
}

export async function completeOfficerTask(id: string, completion_note: string): Promise<OfficerTask> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/officer/tasks/${id}/complete`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ completion_note }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const tasks = getLocalOrInit(STORAGE_KEYS.OFFICER_TASKS, SEED_OFFICER_TASKS);
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.task_status = 'completed';
    task.completed_at = new Date().toISOString();
    task.completion_note = completion_note;
    task.updated_at = new Date().toISOString();
    saveLocal(STORAGE_KEYS.OFFICER_TASKS, tasks);
    return task;
  }
  throw new Error(`Task ${id} not found.`);
}

export async function cancelOfficerTask(id: string, reason: string): Promise<OfficerTask> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/officer/tasks/${id}/cancel`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const tasks = getLocalOrInit(STORAGE_KEYS.OFFICER_TASKS, SEED_OFFICER_TASKS);
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.task_status = 'cancelled';
    task.completion_note = `Cancelled: ${reason}`;
    task.updated_at = new Date().toISOString();
    saveLocal(STORAGE_KEYS.OFFICER_TASKS, tasks);
    return task;
  }
  throw new Error(`Task ${id} not found.`);
}

export async function assignOfficerTask(
  id: string,
  assigned_to: string | null,
  assignment_note?: string
): Promise<OfficerTask> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/officer/tasks/${id}/assign`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to, assignment_note }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const tasks = getLocalOrInit(STORAGE_KEYS.OFFICER_TASKS, SEED_OFFICER_TASKS);
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.assigned_to = assigned_to || undefined;
    task.assigned_to_name = assigned_to ? 'Assigned Officer' : undefined;
    task.updated_at = new Date().toISOString();
    saveLocal(STORAGE_KEYS.OFFICER_TASKS, tasks);
    return task;
  }
  throw new Error(`Task ${id} not found.`);
}

export async function addOfficerTaskComment(id: string, comment_text: string): Promise<TaskComment> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/officer/tasks/${id}/comments`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment_text }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const comments = getLocalOrInit(STORAGE_KEYS.TASK_COMMENTS, SEED_TASK_COMMENTS);
  const newComment: TaskComment = {
    id: `comment-${Date.now()}`,
    task_id: id,
    user_id: 'usr-admin-01',
    user_name: 'Dr. Rajeshwar Sharma',
    user_role: 'system_admin',
    comment_text,
    created_at: new Date().toISOString(),
  };
  comments.unshift(newComment);
  saveLocal(STORAGE_KEYS.TASK_COMMENTS, comments);
  return newComment;
}

export async function escalateOfficerTask(
  id: string,
  payload: { reason: string; target_role?: string; target_user_id?: string }
): Promise<TaskEscalation> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/officer/tasks/${id}/escalate`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const escalations = getLocalOrInit(STORAGE_KEYS.TASK_ESCALATIONS, SEED_TASK_ESCALATIONS);
  const newEsc: TaskEscalation = {
    id: `esc-${Date.now()}`,
    task_id: id,
    escalation_level: 1,
    escalated_from: 'usr-admin-01',
    escalated_from_name: 'Dr. Rajeshwar Sharma',
    escalated_to: payload.target_user_id || 'usr-bureau-01',
    escalated_to_name: 'Bureau Chief (Regulation)',
    escalated_to_role: payload.target_role || 'bureau_officer',
    reason: payload.reason,
    escalated_at: new Date().toISOString(),
  };
  escalations.unshift(newEsc);
  saveLocal(STORAGE_KEYS.TASK_ESCALATIONS, escalations);
  return newEsc;
}

export async function acknowledgeTaskEscalation(
  id: string,
  escId: string,
  note?: string
): Promise<TaskEscalation> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/officer/tasks/${id}/escalations/${escId}/acknowledge`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const escalations = getLocalOrInit(STORAGE_KEYS.TASK_ESCALATIONS, SEED_TASK_ESCALATIONS);
  const esc = escalations.find((e) => e.id === escId);
  if (esc) {
    esc.acknowledged_at = new Date().toISOString();
    esc.acknowledged_by = 'usr-admin-01';
    saveLocal(STORAGE_KEYS.TASK_ESCALATIONS, escalations);
    return esc;
  }
  throw new Error(`Escalation ${escId} not found.`);
}

export async function resolveTaskEscalation(
  id: string,
  escId: string,
  resolution_note: string
): Promise<TaskEscalation> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/officer/tasks/${id}/escalations/${escId}/resolve`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution_note }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const escalations = getLocalOrInit(STORAGE_KEYS.TASK_ESCALATIONS, SEED_TASK_ESCALATIONS);
  const esc = escalations.find((e) => e.id === escId);
  if (esc) {
    esc.resolved_at = new Date().toISOString();
    esc.resolved_by = 'usr-admin-01';
    esc.resolution_note = resolution_note;
    saveLocal(STORAGE_KEYS.TASK_ESCALATIONS, escalations);
    return esc;
  }
  throw new Error(`Escalation ${escId} not found.`);
}

export async function syncOfficerTasks(): Promise<{ status: string; created_count: number; updated_count: number; total_tasks: number }> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/officer/tasks/sync`, {
      method: 'POST',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return { status: 'success', created_count: 0, updated_count: 0, total_tasks: SEED_OFFICER_TASKS.length };
}

export async function fetchOfficerWorkload(): Promise<OfficerWorkloadSummary> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/officer/workload`, {
      method: 'GET',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return SEED_OFFICER_WORKLOAD;
}

export async function fetchOfficerNotifications(): Promise<OfficerNotification[]> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/officer/notifications`, {
      method: 'GET',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return getLocalOrInit(STORAGE_KEYS.OFFICER_NOTIFICATIONS, SEED_OFFICER_NOTIFICATIONS);
}

export async function markOfficerNotificationRead(id: string): Promise<OfficerNotification> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/officer/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const notifs = getLocalOrInit(STORAGE_KEYS.OFFICER_NOTIFICATIONS, SEED_OFFICER_NOTIFICATIONS);
  const n = notifs.find((item) => item.id === id);
  if (n) {
    n.read_at = new Date().toISOString();
    saveLocal(STORAGE_KEYS.OFFICER_NOTIFICATIONS, notifs);
    return n;
  }
  throw new Error(`Notification ${id} not found.`);
}

export async function fetchQueuePolicies(): Promise<QueuePolicy[]> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/officer/policies`, {
      method: 'GET',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return getLocalOrInit(STORAGE_KEYS.QUEUE_POLICIES, SEED_QUEUE_POLICIES);
}

export async function updateQueuePolicy(id: string, payload: Partial<QueuePolicy>): Promise<QueuePolicy> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/officer/policies/${id}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const policies = getLocalOrInit(STORAGE_KEYS.QUEUE_POLICIES, SEED_QUEUE_POLICIES);
  const pol = policies.find((p) => p.id === id);
  if (pol) {
    Object.assign(pol, payload, { updated_at: new Date().toISOString() });
    saveLocal(STORAGE_KEYS.QUEUE_POLICIES, policies);
    return pol;
  }
  throw new Error(`Policy ${id} not found.`);
}

// ==============================================================================
// 12. PHASE 7: LEGACY DATA MIGRATION API
// ==============================================================================

export async function fetchMigrationBatches(): Promise<MigrationBatchSummary[]> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/migrations`, {
      method: 'GET',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  const batches = getLocalOrInit(STORAGE_KEYS.MIGRATION_BATCHES, SEED_MIGRATION_BATCHES);
  return batches.map(({ rows, mappings, preview_data, ...rest }) => rest as MigrationBatchSummary);
}

export async function fetchMigrationBatch(batchId: string): Promise<MigrationBatchDetail> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/migrations/${batchId}`, {
      method: 'GET',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  const batches = getLocalOrInit(STORAGE_KEYS.MIGRATION_BATCHES, SEED_MIGRATION_BATCHES);
  const b = batches.find((item) => item.id === batchId);
  if (b) return b;
  throw new Error(`Migration batch ${batchId} not found.`);
}

export async function uploadMigrationFile(file: File, institutionId?: string): Promise<MigrationBatchSummary> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const formData = new FormData();
    formData.append('file', file);
    if (institutionId) {
      formData.append('institution_id', institutionId);
    }
    const res = await fetch(`${apiUrl}/api/v1/migrations/upload`, {
      method: 'POST',
      headers: { Authorization: headers.Authorization },
      body: formData,
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json();
    throw new Error(err.detail || 'Failed to upload migration spreadsheet.');
  } catch (e: any) {
    if (e.message?.includes('Failed to upload')) throw e;
  }

  // Local fallback
  const batches = getLocalOrInit(STORAGE_KEYS.MIGRATION_BATCHES, SEED_MIGRATION_BATCHES);
  const newBatch: MigrationBatchDetail = {
    id: `batch-${Math.random().toString(36).substring(2, 8)}`,
    institution_id: institutionId || 'inst-01',
    institution_name: 'National Highways Authority of India',
    file_name: file.name,
    file_type: file.name.endsWith('.csv') ? 'csv' : 'xlsx',
    batch_status: 'uploaded',
    total_rows: 3,
    valid_rows: 0,
    invalid_rows: 0,
    imported_rows: 0,
    skipped_rows: 0,
    created_at: new Date().toISOString(),
    headers: ['Institution Name', 'Bank Name', 'Branch', 'FDR No', 'Deposit Amount', 'Currency', 'Date of Issue', 'Date of Maturity', 'Interest Rate', 'Lien In Favour', 'Remarks'],
    mappings: [
      { source_column: 'Institution Name', target_field: 'institution_name' },
      { source_column: 'Bank Name', target_field: 'bank_name' },
      { source_column: 'Branch', target_field: 'branch_name' },
      { source_column: 'FDR No', target_field: 'fdr_number' },
      { source_column: 'Deposit Amount', target_field: 'amount' },
      { source_column: 'Currency', target_field: 'currency' },
      { source_column: 'Date of Issue', target_field: 'issue_date' },
      { source_column: 'Date of Maturity', target_field: 'maturity_date' },
      { source_column: 'Interest Rate', target_field: 'interest_rate' },
      { source_column: 'Lien In Favour', target_field: 'lien_in_favour' },
      { source_column: 'Remarks', target_field: 'remarks' },
    ],
    preview_data: [],
    rows: [],
  };
  batches.unshift(newBatch);
  saveLocal(STORAGE_KEYS.MIGRATION_BATCHES, batches);
  return newBatch;
}

export async function setColumnMappings(
  batchId: string,
  mappings: ColumnMappingItem[],
  saveAsProfile?: string
): Promise<ColumnMappingItem[]> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/migrations/${batchId}/mapping`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mappings, save_as_profile: saveAsProfile }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const batches = getLocalOrInit(STORAGE_KEYS.MIGRATION_BATCHES, SEED_MIGRATION_BATCHES);
  const b = batches.find((item) => item.id === batchId);
  if (b) {
    b.mappings = mappings;
    b.batch_status = 'mapping';
    saveLocal(STORAGE_KEYS.MIGRATION_BATCHES, batches);
    return mappings;
  }
  throw new Error(`Batch ${batchId} not found.`);
}

export async function validateMigrationBatch(batchId: string): Promise<any> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/migrations/${batchId}/validate`, {
      method: 'POST',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const batches = getLocalOrInit(STORAGE_KEYS.MIGRATION_BATCHES, SEED_MIGRATION_BATCHES);
  const b = batches.find((item) => item.id === batchId);
  if (b) {
    b.batch_status = b.invalid_rows > 0 ? 'review_required' : 'ready';
    saveLocal(STORAGE_KEYS.MIGRATION_BATCHES, batches);
    return {
      batch_id: batchId,
      total_rows: b.total_rows,
      valid_rows: b.valid_rows,
      invalid_rows: b.invalid_rows,
      status: b.batch_status,
    };
  }
  throw new Error(`Batch ${batchId} not found.`);
}

export async function fetchMigrationErrors(batchId: string): Promise<MigrationRowItem[]> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/migrations/${batchId}/errors`, {
      method: 'GET',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const batches = getLocalOrInit(STORAGE_KEYS.MIGRATION_BATCHES, SEED_MIGRATION_BATCHES);
  const b = batches.find((item) => item.id === batchId);
  if (b && b.rows) {
    return b.rows.filter(
      (r) => r.validation_status === 'invalid' || r.validation_status === 'duplicate_exact' || r.validation_status === 'duplicate_fuzzy'
    );
  }
  return [];
}

export async function reviewMigrationRow(
  batchId: string,
  rowId: string,
  payload: { action: 'correct' | 'exclude' | 'approve'; corrected_data?: Record<string, any>; review_note?: string }
): Promise<MigrationRowItem> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/migrations/${batchId}/rows/${rowId}/review`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const batches = getLocalOrInit(STORAGE_KEYS.MIGRATION_BATCHES, SEED_MIGRATION_BATCHES);
  const b = batches.find((item) => item.id === batchId);
  if (b && b.rows) {
    const row = b.rows.find((r) => r.id === rowId);
    if (row) {
      if (payload.action === 'correct' && payload.corrected_data) {
        Object.assign(row.normalized_data, payload.corrected_data);
        row.validation_status = 'reviewed';
        row.validation_errors = [];
      } else if (payload.action === 'approve') {
        row.validation_status = 'reviewed';
      } else if (payload.action === 'exclude') {
        row.validation_status = 'excluded';
      }
      row.review_note = payload.review_note;
      saveLocal(STORAGE_KEYS.MIGRATION_BATCHES, batches);
      return row;
    }
  }
  throw new Error(`Row ${rowId} not found in batch ${batchId}.`);
}

export async function executeMigrationImport(
  batchId: string,
  skipFuzzy: boolean = true
): Promise<{ batch_id: string; status: string; imported_count: number; skipped_count: number }> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/migrations/${batchId}/import`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ skip_fuzzy_duplicates: skipFuzzy }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const batches = getLocalOrInit(STORAGE_KEYS.MIGRATION_BATCHES, SEED_MIGRATION_BATCHES);
  const b = batches.find((item) => item.id === batchId);
  if (b) {
    b.batch_status = 'completed';
    b.imported_rows = b.valid_rows;
    b.completed_at = new Date().toISOString();
    saveLocal(STORAGE_KEYS.MIGRATION_BATCHES, batches);
    return {
      batch_id: batchId,
      status: 'completed',
      imported_count: b.imported_rows,
      skipped_count: b.invalid_rows,
    };
  }
  throw new Error(`Batch ${batchId} not found.`);
}

export async function cancelMigrationBatch(batchId: string): Promise<void> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    await fetch(`${apiUrl}/api/v1/migrations/${batchId}/cancel`, {
      method: 'POST',
      headers: { ...headers },
    });
  } catch {
    // fallback
  }
  const batches = getLocalOrInit(STORAGE_KEYS.MIGRATION_BATCHES, SEED_MIGRATION_BATCHES);
  const b = batches.find((item) => item.id === batchId);
  if (b) {
    b.batch_status = 'cancelled';
    saveLocal(STORAGE_KEYS.MIGRATION_BATCHES, batches);
  }
}

export async function fetchMigrationProfiles(): Promise<MigrationMappingProfile[]> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/migrations/profiles`, {
      method: 'GET',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return getLocalOrInit(STORAGE_KEYS.MIGRATION_PROFILES, SEED_MIGRATION_PROFILES);
}

// ==============================================================================
// 13. PHASE 7: COMPLIANCE DOCUMENT MANAGEMENT API
// ==============================================================================

export async function fetchComplianceTemplates(): Promise<ComplianceTemplate[]> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/compliance/templates`, {
      method: 'GET',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return getLocalOrInit(STORAGE_KEYS.COMPLIANCE_TEMPLATES, SEED_COMPLIANCE_TEMPLATES);
}

export async function createComplianceTemplate(payload: Partial<ComplianceTemplate>): Promise<ComplianceTemplate> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/compliance/templates`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create template.');
  } catch (e: any) {
    if (e.message?.includes('Failed to create')) throw e;
  }

  const templates = getLocalOrInit(STORAGE_KEYS.COMPLIANCE_TEMPLATES, SEED_COMPLIANCE_TEMPLATES);
  const newTpl: ComplianceTemplate = {
    id: `template-${Math.random().toString(36).substring(2, 8)}`,
    template_name: payload.template_name || 'Custom Regulatory Template',
    template_type: (payload.template_type as any) || 'fdr_confirmation',
    description: payload.description,
    template_content: payload.template_content || '',
    version: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  templates.push(newTpl);
  saveLocal(STORAGE_KEYS.COMPLIANCE_TEMPLATES, templates);
  return newTpl;
}

export async function updateComplianceTemplate(id: string, payload: Partial<ComplianceTemplate>): Promise<ComplianceTemplate> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/compliance/templates/${id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const templates = getLocalOrInit(STORAGE_KEYS.COMPLIANCE_TEMPLATES, SEED_COMPLIANCE_TEMPLATES);
  const tpl = templates.find((t) => t.id === id);
  if (tpl) {
    Object.assign(tpl, payload, { version: tpl.version + 1, updated_at: new Date().toISOString() });
    saveLocal(STORAGE_KEYS.COMPLIANCE_TEMPLATES, templates);
    return tpl;
  }
  throw new Error(`Template ${id} not found.`);
}

export async function fetchComplianceDocuments(institutionId?: string): Promise<ComplianceDocument[]> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const url = institutionId
      ? `${apiUrl}/api/v1/compliance/documents?institution_id=${institutionId}`
      : `${apiUrl}/api/v1/compliance/documents`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const docs = getLocalOrInit(STORAGE_KEYS.COMPLIANCE_DOCUMENTS, SEED_COMPLIANCE_DOCUMENTS);
  if (institutionId) {
    return docs.filter((d) => d.institution_id === institutionId);
  }
  return docs;
}

export async function fetchComplianceDocument(id: string): Promise<ComplianceDocument> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/compliance/documents/${id}`, {
      method: 'GET',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const docs = getLocalOrInit(STORAGE_KEYS.COMPLIANCE_DOCUMENTS, SEED_COMPLIANCE_DOCUMENTS);
  const doc = docs.find((d) => d.id === id);
  if (doc) return doc;
  throw new Error(`Compliance document ${id} not found.`);
}

export async function generateComplianceDocument(payload: {
  template_id: string;
  institution_id: string;
  fdr_id?: string;
  custom_title?: string;
  custom_parameters?: Record<string, string>;
}): Promise<ComplianceDocument> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/compliance/documents/generate`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json();
    throw new Error(err.detail || 'Failed to generate compliance document.');
  } catch (e: any) {
    if (e.message?.includes('Failed to generate')) throw e;
  }

  const templates = getLocalOrInit(STORAGE_KEYS.COMPLIANCE_TEMPLATES, SEED_COMPLIANCE_TEMPLATES);
  const tpl = templates.find((t) => t.id === payload.template_id) || templates[0];
  const docs = getLocalOrInit(STORAGE_KEYS.COMPLIANCE_DOCUMENTS, SEED_COMPLIANCE_DOCUMENTS);

  const refNo = `AICTE/FDR/2026/DOC-${Math.floor(10000 + Math.random() * 90000)}`;
  const content = tpl.template_content
    .replace('{{reference_number}}', refNo)
    .replace('{{generated_date}}', new Date().toLocaleDateString('en-IN'))
    .replace('{{institution_name}}', 'National Highways Authority of India')
    .replace('{{fdr_number}}', 'FDR-2026-NHAI-84920')
    .replace('{{amount}}', '15,000,000')
    .replace('{{currency}}', 'INR')
    .replace('{{bank_name}}', 'State Bank of India')
    .replace('{{branch_name}}', 'SBI Main Branch')
    .replace('{{maturity_date}}', '2027-01-15')
    .replace('{{issue_date}}', '2026-01-15')
    .replace('{{lien_in_favour}}', 'AICTE');

  const newDoc: ComplianceDocument = {
    id: `doc-${Math.random().toString(36).substring(2, 8)}`,
    template_id: tpl.id,
    template_name: tpl.template_name,
    template_type: tpl.template_type,
    institution_id: payload.institution_id,
    institution_name: 'National Highways Authority of India',
    fdr_id: payload.fdr_id,
    fdr_number: 'FDR-2026-NHAI-84920',
    document_title: payload.custom_title || tpl.template_name,
    reference_number: refNo,
    content_text: content,
    current_version: 1,
    document_status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  docs.unshift(newDoc);
  saveLocal(STORAGE_KEYS.COMPLIANCE_DOCUMENTS, docs);
  return newDoc;
}

export async function updateComplianceDocument(
  id: string,
  payload: { document_title?: string; content_text?: string; change_summary?: string }
): Promise<ComplianceDocument> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/compliance/documents/${id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const docs = getLocalOrInit(STORAGE_KEYS.COMPLIANCE_DOCUMENTS, SEED_COMPLIANCE_DOCUMENTS);
  const doc = docs.find((d) => d.id === id);
  if (doc) {
    if (payload.document_title) doc.document_title = payload.document_title;
    if (payload.content_text) {
      doc.content_text = payload.content_text;
      doc.current_version += 1;
    }
    doc.updated_at = new Date().toISOString();
    saveLocal(STORAGE_KEYS.COMPLIANCE_DOCUMENTS, docs);
    return doc;
  }
  throw new Error(`Document ${id} not found.`);
}

export async function submitComplianceDocumentForReview(id: string): Promise<ComplianceDocument> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/compliance/documents/${id}/submit-review`, {
      method: 'POST',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const docs = getLocalOrInit(STORAGE_KEYS.COMPLIANCE_DOCUMENTS, SEED_COMPLIANCE_DOCUMENTS);
  const doc = docs.find((d) => d.id === id);
  if (doc) {
    doc.document_status = 'submitted_for_review';
    doc.updated_at = new Date().toISOString();
    saveLocal(STORAGE_KEYS.COMPLIANCE_DOCUMENTS, docs);
    return doc;
  }
  throw new Error(`Document ${id} not found.`);
}

export async function reviewComplianceDocument(
  id: string,
  payload: { action: 'approved' | 'returned_for_correction'; comments?: string }
): Promise<ComplianceDocument> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/compliance/documents/${id}/review`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const docs = getLocalOrInit(STORAGE_KEYS.COMPLIANCE_DOCUMENTS, SEED_COMPLIANCE_DOCUMENTS);
  const doc = docs.find((d) => d.id === id);
  if (doc) {
    doc.document_status = payload.action === 'approved' ? 'approved' : 'returned_for_correction';
    doc.updated_at = new Date().toISOString();
    saveLocal(STORAGE_KEYS.COMPLIANCE_DOCUMENTS, docs);
    return doc;
  }
  throw new Error(`Document ${id} not found.`);
}

export async function finalizeComplianceDocument(id: string): Promise<{ status: string; document_id: string; pdf_url: string; size_bytes: number }> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/compliance/documents/${id}/finalize`, {
      method: 'POST',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const docs = getLocalOrInit(STORAGE_KEYS.COMPLIANCE_DOCUMENTS, SEED_COMPLIANCE_DOCUMENTS);
  const doc = docs.find((d) => d.id === id);
  if (doc) {
    doc.document_status = 'finalized';
    doc.finalized_at = new Date().toISOString();
    doc.finalized_pdf_path = `compliance/${id}/final.pdf`;
    saveLocal(STORAGE_KEYS.COMPLIANCE_DOCUMENTS, docs);
    return {
      status: 'finalized',
      document_id: id,
      pdf_url: `/api/v1/compliance/documents/${id}/pdf`,
      size_bytes: 42000,
    };
  }
  throw new Error(`Document ${id} not found.`);
}

export async function mockSignComplianceDocument(
  id: string,
  payload: { signer_display_name: string; consent_acknowledged: boolean }
): Promise<MockSignatureRecord> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/compliance/documents/${id}/mock-sign`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const sigRecord: MockSignatureRecord = {
    id: `sig-${Math.random().toString(36).substring(2, 8)}`,
    document_id: id,
    signer_display_name: payload.signer_display_name,
    signature_reference: `MOCK-SIG-${Math.floor(10000 + Math.random() * 90000)}-DEMO`,
    signed_at: new Date().toISOString(),
    status: 'demonstration_only',
    disclaimer: 'DEMO — NOT A LEGALLY VALID DIGITAL SIGNATURE',
  };

  const docs = getLocalOrInit(STORAGE_KEYS.COMPLIANCE_DOCUMENTS, SEED_COMPLIANCE_DOCUMENTS);
  const doc = docs.find((d) => d.id === id);
  if (doc) {
    doc.document_status = 'signed';
    doc.mock_signature_id = sigRecord.id;
    doc.mock_signature = sigRecord;
    doc.updated_at = new Date().toISOString();
    saveLocal(STORAGE_KEYS.COMPLIANCE_DOCUMENTS, docs);
  }

  return sigRecord;
}

export async function fetchDocumentVersions(id: string): Promise<ComplianceDocumentVersion[]> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${apiUrl}/api/v1/compliance/documents/${id}/versions`, {
      method: 'GET',
      headers: { ...headers },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return [
    {
      id: `ver-${id}-1`,
      document_id: id,
      version_number: 1,
      content_snapshot: 'Initial statutory draft pre-filled from Central FDR Vault.',
      changed_by: 'System Officer',
      change_summary: 'Initial automated draft generation',
      sha256_hash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ];
}




