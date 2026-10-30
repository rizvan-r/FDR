// ==============================================================================
// FDR-Chain: Core TypeScript Definitions
// ==============================================================================

export type UserRole =
  | 'institution_user'
  | 'bank_nodal_officer'
  | 'regional_officer'
  | 'bureau_officer'
  | 'finance_officer'
  | 'system_admin';

export interface Role {
  id: string;
  name: UserRole;
  display_name: string;
  description?: string;
  created_at: string;
}

export type InstitutionType =
  | 'central_psu'
  | 'state_psu'
  | 'autonomous_body'
  | 'government_department'
  | 'statutory_corporation'
  | 'other';

export type BankType =
  | 'public_sector'
  | 'private_sector'
  | 'scheduled_commercial'
  | 'regional_rural'
  | 'cooperative';

export interface Region {
  id: string;
  code: string;
  name: string;
  description?: string;
  state_coverage: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Institution {
  id: string;
  code: string;
  name: string;
  institution_type: InstitutionType;
  region_id?: string;
  region?: Region;
  registration_number?: string;
  nodal_ministry?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  contact_email: string;
  contact_phone?: string;
  website?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Bank {
  id: string;
  code: string;
  name: string;
  bank_type: BankType;
  headquarters?: string;
  nodal_contact_name?: string;
  contact_email: string;
  contact_phone?: string;
  website?: string;
  is_active: boolean;
  branch_count?: number;
  created_at: string;
  updated_at: string;
}

export interface BankBranch {
  id: string;
  bank_id: string;
  bank?: Bank;
  branch_name: string;
  branch_code?: string;
  ifsc_code: string;
  region_id?: string;
  region?: Region;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  designation?: string;
  employee_id?: string;
  phone?: string;
  institution_id?: string;
  institution?: Institution;
  bank_id?: string;
  bank?: Bank;
  bank_branch_id?: string;
  bank_branch?: BankBranch;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  roles: UserRole[];
  region_scopes: string[]; // Region IDs
}

export interface AuthState {
  user: UserProfile | null;
  roles: UserRole[];
  activeRole: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean; // Indicates if live Supabase credentials are valid
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
