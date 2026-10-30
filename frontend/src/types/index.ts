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

// ==============================================================================
// PHASE 2: FDR REPOSITORY & DOCUMENT MANAGEMENT TYPES
// ==============================================================================

export type FDRLifecycleStatus =
  | 'pending'
  | 'active'
  | 'under_review'
  | 'matured'
  | 'released'
  | 'invoked'
  | 'renewed';

export type FDRVerificationStatus =
  | 'institution_declared'
  | 'bank_confirmed'
  | 'signature_verified'
  | 'bank_verified'
  | 'discrepancy_flagged'
  | 'rejected';

// ==============================================================================
// PHASE 3: DIGITAL BANK VERIFICATION, TRUST TIERS & ED25519 SIGNATURES
// ==============================================================================

export type TrustTier = 1 | 2 | 3;

export type AttestationType =
  | 'tier2_bank_confirmation'
  | 'tier3_digital_signature';

export type VerificationRequestStatus =
  | 'pending'
  | 'consumed'
  | 'expired'
  | 'revoked';

export interface VerificationRequest {
  id: string;
  fdr_id: string;
  institution_id: string;
  bank_id: string;
  status: VerificationRequestStatus;
  fdr_snapshot: Record<string, any>;
  expires_at: string;
  consumed_at?: string;
  consumed_by?: string;
  created_by: string;
  created_at: string;
  raw_token?: string;
  verification_url?: string;
}

export interface BankAttestation {
  id: string;
  fdr_id: string;
  institution_id: string;
  bank_id: string;
  branch_id?: string;
  attestation_type: AttestationType;
  trust_tier: 2 | 3;
  verification_status: string;
  request_id?: string;
  key_id?: string;
  signed_payload?: Record<string, any>;
  signature_hex?: string;
  nonce?: string;
  attested_by?: string;
  attestation_metadata: Record<string, any>;
  created_at: string;
}

export interface BankKey {
  id: string;
  bank_id: string;
  bank_name?: string;
  key_id: string;
  algorithm: string;
  public_key_pem: string;
  public_key_raw_hex: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  is_revoked: boolean;
  revoked_at?: string;
  revocation_reason?: string;
  created_at: string;
}

export interface SignedFDRPayload {
  schema_version: string;
  issuer: string;
  audience: string;
  key_id: string;
  nonce: string;
  issued_at: string;
  institution_code: string;
  bank_code: string;
  branch_ifsc: string;
  fdr_number: string;
  amount: string;
  currency: string;
  issue_date: string;
  maturity_date: string;
  lien_in_favour: string;
}

export type FDRHeartbeatStatus =
  | 'not_started'
  | 'alive'
  | 'stale'
  | 'broken'
  | 'unresponsive';

export type DocumentType =
  | 'original_fdr'
  | 'supporting_document'
  | 'lien_letter'
  | 'other';

export interface FDRDocument {
  id: string;
  fdr_id: string;
  institution_id: string;
  document_type: DocumentType;
  original_filename: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  sha256_checksum: string;
  description?: string;
  uploaded_by?: string;
  uploaded_at: string;
  is_active: boolean;
  download_url?: string;
}

export interface FDREvent {
  id: string;
  fdr_id: string;
  institution_id: string;
  actor_id?: string;
  actor_name?: string;
  actor_email?: string;
  event_type: string;
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface FDR {
  id: string;
  institution_id: string;
  institution?: Institution;
  institution_name?: string;
  institution_code?: string;
  bank_id: string;
  bank?: Bank;
  bank_name?: string;
  bank_code?: string;
  branch_id: string;
  branch?: BankBranch;
  branch_name?: string;
  ifsc_code?: string;
  region_id?: string;
  region?: Region;
  region_name?: string;
  fdr_number: string;
  amount: number;
  currency: string;
  issue_date: string;
  maturity_date: string;
  interest_rate?: number;
  lien_in_favour: string;
  lifecycle_status: FDRLifecycleStatus;
  trust_tier: 1 | 2 | 3;
  verification_status: FDRVerificationStatus;
  heartbeat_status: FDRHeartbeatStatus;
  last_heartbeat_at?: string;
  next_heartbeat_at?: string;
  heartbeat_failure_count?: number;
  remarks?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  documents?: FDRDocument[];
  events?: FDREvent[];
}

// ==============================================================================
// PHASE 4: PERIODIC HEARTBEAT VERIFICATION, POLICIES & ALERT DESK
// ==============================================================================

export type CheckStatus =
  | 'scheduled'
  | 'requested'
  | 'confirmed'
  | 'rejected'
  | 'timed_out';

export type AlertType =
  | 'heartbeat_stale'
  | 'heartbeat_unresponsive'
  | 'heartbeat_broken'
  | 'maturity_warning_90d'
  | 'maturity_warning_60d'
  | 'maturity_warning_30d'
  | 'maturity_warning_7d'
  | 'maturity_warning_1d'
  | 'maturity_due_today'
  | 'maturity_overdue'
  | 'discrepancy_reported';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface HeartbeatPolicy {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  min_amount?: number;
  max_amount?: number;
  frequency_days: number;
  response_timeout_hours: number;
  max_retries: number;
  retry_interval_hours: number;
  stale_threshold_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HeartbeatCheck {
  id: string;
  fdr_id: string;
  policy_id?: string;
  scheduled_at: string;
  requested_at?: string;
  responded_at?: string;
  check_status: CheckStatus;
  verification_request_id?: string;
  attestation_id?: string;
  retry_count: number;
  next_retry_at?: string;
  timed_out_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // joined fields
  fdr_number?: string;
  bank_name?: string;
  institution_name?: string;
  verification_url?: string;
  raw_token?: string;
}

export interface FDRAlert {
  id: string;
  fdr_id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  is_read: boolean;
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  created_at: string;
  // joined fields
  fdr_number?: string;
  amount?: number;
  bank_name?: string;
  institution_name?: string;
  maturity_date?: string;
  heartbeat_status?: FDRHeartbeatStatus;
}

export interface HeartbeatDashboardStats {
  total_monitored_fdrs: number;
  alive_count: number;
  stale_count: number;
  broken_count: number;
  unresponsive_count: number;
  not_started_count: number;
  total_checks_count: number;
  pending_checks_count: number;
  active_alerts_count: number;
  critical_alerts_count: number;
  upcoming_maturities_30d: number;
  compliance_rate_percent: number;
}

export interface FDRSummaryStats {
  total_fdrs: number;
  total_amount: number;
  pending_count: number;
  active_count: number;
  tier1_count: number;
  upcoming_maturity_30d: number;
  upcoming_maturity_90d: number;
}

export interface FDRFilterParams {
  search?: string;
  bank_id?: string;
  institution_id?: string;
  lifecycle_status?: string;
  trust_tier?: number;
  verification_status?: string;
  region_id?: string;
  page?: number;
  page_size?: number;
}

// ==============================================================================
// PHASE 5: RENEWAL MANAGEMENT & FDR LINEAGE (DIRECTED ACYCLIC GRAPH)
// ==============================================================================

export type RenewalCaseStatus =
  | 'draft'
  | 'submitted'
  | 'matching'
  | 'evidence_pending'
  | 'awaiting_bank_confirmation'
  | 'bank_confirmed'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type LineageRelationshipType = 'renewal' | 'replacement';

export type RenewalEvidenceType =
  | 'replacement_fdr_copy'
  | 'bank_renewal_advice'
  | 'original_fdr_closure'
  | 'bank_pledge_confirmation'
  | 'other'
  | 'other_supporting_document';

export interface RenewalEvidence {
  id: string;
  renewal_case_id: string;
  document_id?: string;
  evidence_type: RenewalEvidenceType;
  file_name?: string;
  file_path?: string;
  file_size_bytes?: number;
  mime_type?: string;
  sha256_checksum?: string;
  description?: string;
  is_reviewed: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  uploaded_by?: string;
  created_at: string;
}

export interface RenewalMatchCandidate {
  candidate_fdr_id: string;
  candidate_fdr_number?: string;
  bank_name?: string;
  branch_name?: string;
  amount?: number;
  currency?: string;
  issue_date?: string;
  maturity_date?: string;
  trust_tier?: number;
  heartbeat_status?: string;
  score: number;
  confidence_level?: 'high' | 'moderate' | 'low';
  matching_factors: string[];
  mismatched_fields: string[];
  explanation?: string;
}

export interface MatchingResult {
  parent_fdr_id?: string;
  evaluated_at?: string;
  total_candidates_evaluated: number;
  candidates: RenewalMatchCandidate[];
  suggestions?: RenewalMatchCandidate[];
  advisory_notice: string;
}

export interface RenewalCase {
  id: string;
  case_number: string;
  original_fdr_id: string;
  parent_fdr_id?: string;
  proposed_replacement_fdr_id?: string;
  proposed_fdr_id?: string;
  institution_id: string;
  institution_name?: string;
  bank_id?: string;
  bank_name?: string;
  status: RenewalCaseStatus;
  case_status?: RenewalCaseStatus;
  submission_notes?: string;
  renewal_reference?: string;
  matching_score?: number;
  match_score?: number;
  matching_analysis?: Record<string, any>;
  submitted_by?: string;
  submitted_at?: string;
  reviewer_id?: string;
  reviewed_at?: string;
  decision_notes?: string;
  created_at: string;
  updated_at: string;
  original_fdr?: FDR;
  proposed_replacement_fdr?: FDR;
  evidence?: RenewalEvidence[];
}

export interface FDRLineageNode {
  fdr_id: string;
  id?: string;
  fdr_number: string;
  institution_id: string;
  institution_name?: string;
  bank_id?: string;
  bank_name?: string;
  branch_name?: string;
  amount: number;
  currency: string;
  issue_date?: string;
  maturity_date?: string;
  lifecycle_status: FDRLifecycleStatus;
  trust_tier: number;
  verification_status?: string;
  heartbeat_status: string;
  is_current?: boolean;
  is_current_target?: boolean;
  generation_level: number;
}

export interface FDRLineageEdge {
  id: string;
  parent_fdr_id: string;
  child_fdr_id: string;
  renewal_case_id: string;
  relationship_type: LineageRelationshipType;
  approved_by?: string;
  approved_at?: string;
  created_at?: string;
}

export interface FDRLineageGraph {
  root_fdr_id: string;
  center_fdr_id?: string;
  target_fdr_id?: string;
  total_nodes: number;
  total_edges: number;
  nodes: FDRLineageNode[];
  edges: FDRLineageEdge[];
  has_cycles: boolean;
  is_leaf: boolean;
}

export interface RenewalDashboardStats {
  total_cases: number;
  draft_cases: number;
  submitted_cases: number;
  awaiting_bank_confirmation: number;
  under_review_cases: number;
  approved_cases: number;
  rejected_cases: number;
  upcoming_maturities_30d: number;
  pending_officer_review: number;
  recent_cases: RenewalCase[];
}

// ==============================================================================
// PHASE 6: OFFICER DASHBOARD & PRIORITY QUEUE TYPES
// ==============================================================================

export type TaskPriorityLevel = 'critical' | 'high' | 'medium' | 'low';

export type TaskStatus = 'open' | 'in_progress' | 'waiting' | 'completed' | 'cancelled';

export type TaskType =
  | 'broken_fdr_review'
  | 'stale_heartbeat_review'
  | 'unresponsive_heartbeat_review'
  | 'pending_bank_verification'
  | 'overdue_verification'
  | 'renewal_approval'
  | 'renewal_evidence_review'
  | 'upcoming_maturity_follow_up'
  | 'escalation_acknowledgement';

export type TaskSourceType =
  | 'fdr_alert'
  | 'heartbeat_check'
  | 'verification_request'
  | 'renewal_case'
  | 'fdr'
  | 'escalation';

export interface PriorityReason {
  code: string;
  points: number;
  description: string;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  assigned_to: string;
  assigned_to_name?: string;
  assigned_by: string;
  assigned_by_name?: string;
  assignment_note?: string;
  assigned_at: string;
  unassigned_at?: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  user_name?: string;
  user_role?: string;
  comment_text: string;
  created_at: string;
}

export interface TaskEscalation {
  id: string;
  task_id: string;
  escalation_level: number;
  escalated_from?: string;
  escalated_from_name?: string;
  escalated_to?: string;
  escalated_to_name?: string;
  escalated_to_role?: string;
  reason: string;
  escalated_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_note?: string;
}

export interface OfficerTask {
  id: string;
  task_type: TaskType;
  source_type: TaskSourceType;
  source_id: string;
  fdr_id?: string;
  fdr_number?: string;
  title: string;
  description?: string;
  institution_id?: string;
  institution_name?: string;
  region_id?: string;
  region_name?: string;
  bank_id?: string;
  bank_name?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  created_by?: string;
  priority_score: number;
  priority_level: TaskPriorityLevel;
  priority_reasons: PriorityReason[];
  task_status: TaskStatus;
  due_at?: string;
  started_at?: string;
  completed_at?: string;
  completion_note?: string;
  created_at: string;
  updated_at: string;
  task_age_hours?: number;
  is_overdue?: boolean;
  is_escalated?: boolean;
  assignments?: TaskAssignment[];
  comments?: TaskComment[];
  escalations?: TaskEscalation[];
  source_data?: Record<string, any>;
  fdr_summary?: Record<string, any>;
}

export interface OfficerNotification {
  id: string;
  recipient_user_id: string;
  task_id?: string;
  notification_type: string;
  title: string;
  message: string;
  read_at?: string;
  created_at: string;
}

export interface QueuePolicy {
  id: string;
  name: string;
  is_active: boolean;
  is_default: boolean;
  weights: Record<string, number>;
  thresholds: Record<string, number>;
  deadline_rules: Record<string, any>;
  escalation_rules: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface OfficerWorkloadItem {
  officer_id: string;
  officer_name: string;
  officer_role: string;
  email: string;
  assigned_tasks: number;
  critical_tasks: number;
  overdue_tasks: number;
  completed_tasks: number;
}

export interface OfficerWorkloadSummary {
  officers: OfficerWorkloadItem[];
  total_assigned: number;
  total_unassigned: number;
}

export interface OfficerDashboardStats {
  open_tasks: number;
  critical_tasks: number;
  high_priority_tasks: number;
  overdue_tasks: number;
  awaiting_bank_response: number;
  awaiting_officer_review: number;
  completed_this_month: number;
  average_processing_hours: number;
  pending_escalations: number;
  recent_activity: Array<{
    time: string;
    action: string;
    user: string;
    fdr: string;
  }>;
}


