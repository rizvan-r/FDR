import { supabase, isSupabaseConfigured } from './supabase';
import { Region, Institution, Bank, BankBranch, UserProfile, UserRole } from '../types';
import { SEED_REGIONS, SEED_BANKS, SEED_BRANCHES, SEED_INSTITUTIONS, DEMO_USERS } from './mockData';

// Storage keys for local development persistence
const STORAGE_KEYS = {
  REGIONS: 'fdr_dev_regions',
  BANKS: 'fdr_dev_banks',
  BRANCHES: 'fdr_dev_branches',
  INSTITUTIONS: 'fdr_dev_institutions',
  USERS: 'fdr_dev_users',
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
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .order('name');
    if (error) throw new Error(error.message);
    return data as Region[];
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
    const { data, error } = await supabase
      .from('institutions')
      .select('*, region:regions(*)')
      .order('name');
    if (error) throw new Error(error.message);
    return data as Institution[];
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
    const { data, error } = await supabase
      .from('institutions')
      .select('*, region:regions(*)')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return data as Institution;
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
    const { data, error } = await supabase
      .from('banks')
      .select('*, bank_branches(count)')
      .order('name');
    if (error) throw new Error(error.message);
    return data.map((b: any) => ({
      ...b,
      branch_count: b.bank_branches?.[0]?.count || 0,
    })) as Bank[];
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
    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return data as Bank;
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
    const { data, error } = await supabase
      .from('bank_branches')
      .select('*, region:regions(*)')
      .eq('bank_id', bankId)
      .order('branch_name');
    if (error) throw new Error(error.message);
    return data as BankBranch[];
  }
  const branches = getLocalOrInit(STORAGE_KEYS.BRANCHES, SEED_BRANCHES);
  const regions = getLocalOrInit(STORAGE_KEYS.REGIONS, SEED_REGIONS);
  return branches
    .filter((b) => b.bank_id === bankId)
    .map((b) => ({
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
