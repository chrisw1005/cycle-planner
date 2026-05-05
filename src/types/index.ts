// ==================== Tenants ====================
export interface Tenant {
  id: string
  slug: string
  name: string
  primary_domain: string | null
  created_at: string
  updated_at: string
}

// Lightweight tenant info attached to sessions / contexts
export interface TenantInfo {
  id: string
  slug: string
  name: string
}

// ==================== Auth & Profile ====================
export type UserRole = 'developer' | 'admin' | 'viewer'

// Supabase Auth profile (developer only — global, not tenant-bound)
export interface Profile {
  id: string
  email: string
  display_name: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

// Self-managed accounts (admin/viewer) — tenant-scoped
export interface Account {
  id: string
  tenant_id: string
  username: string
  display_name: string
  role: 'admin' | 'viewer'
  created_at: string
  updated_at: string
}

// JWT payload for admin/viewer sessions (tenant-bound)
export interface SessionPayload {
  sub: string       // account id
  username: string
  display_name: string
  role: 'admin' | 'viewer'
  tenant_id: string
  tenant_slug: string
  iat: number
  exp: number
}

// ==================== People ====================
export interface Person {
  id: string
  tenant_id: string
  nickname: string
  height: number | null
  weight: number | null
  body_fat: number | null
  age: number | null
  needs_cycle: boolean
  cycle_goal_notes: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined fields
  last_cycle_date?: string | null
  cycles?: Cycle[]
}

export type PersonFormData = Omit<Person, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'last_cycle_date' | 'cycles'>

// ==================== Drugs ====================
export type PrimaryCategory = 'Injectable' | 'Oral' | 'PCT'
export type SubCategory = 'Test' | 'Nor-19' | 'DHT' | 'AI' | 'SERM' | 'Prolactin' | 'Other'
export type EsterType = 'Long' | 'Short' | 'E3D'

export interface DrugTemplate {
  id: string
  generic_name: string
  short_name: string
  brand_names: string[] | null
  primary_category: PrimaryCategory
  sub_category: SubCategory | null
  ester_type: EsterType | null
  default_concentration: number | null
  default_unit: string
  is_system: boolean
}

export interface Drug {
  id: string
  tenant_id: string
  template_id: string | null
  name: string
  concentration: number
  primary_category: PrimaryCategory
  sub_category: SubCategory | null
  ester_type: EsterType | null
  unit: string
  brand: string | null
  image_url: string | null
  inventory_count: number
  tabs_per_box: number | null
  created_at: string
  updated_at: string
  // Joined
  template?: DrugTemplate
}

export type DrugFormData = Omit<Drug, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'template'>

// ==================== Cycles ====================
export type CycleStatus = 'Scheduled' | 'Planned' | 'Testing' | 'Completed' | 'Archived'

export interface Cycle {
  id: string
  tenant_id: string
  person_id: string
  name: string | null
  total_weeks: number
  status: CycleStatus
  start_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  person?: Person
  cycle_drugs?: CycleDrug[]
}

export type CycleFormData = Omit<Cycle, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'person' | 'cycle_drugs'>

// ==================== Cycle Drugs ====================
export interface CycleDrug {
  id: string
  tenant_id: string
  cycle_id: string
  drug_id: string
  weekly_dose: number | null
  daily_dose: number | null
  injection_ml: number | null       // E3D only: ml per injection
  total_injections: number | null   // E3D only: total number of injections
  vial_count: number | null          // E3D only: user-specified number of vials needed
  schedule_mode: string | null      // null/'daily', 'eod', 'split_weekly'
  start_week: number
  end_week: number
  created_at: string
  // Joined
  drug?: Drug
  cells?: CycleCell[]
}

export type CycleDrugFormData = Omit<CycleDrug, 'id' | 'tenant_id' | 'created_at' | 'drug' | 'cells'>

// ==================== Cycle Templates ====================
export interface CycleTemplate {
  id: string
  tenant_id: string
  name: string
  description: string | null
  total_weeks: number
  created_at: string
  updated_at: string
  // Joined
  drugs?: CycleTemplateDrug[]
}

export interface CycleTemplateDrug {
  id: string
  tenant_id: string
  template_id: string
  drug_id: string
  weekly_dose: number | null
  daily_dose: number | null
  injection_ml: number | null
  total_injections: number | null
  schedule_mode: string | null
  start_week: number
  end_week: number
  created_at: string
  // Joined
  drug?: Drug
}

// ==================== Cycle Cells ====================
export interface CycleCell {
  id: string
  tenant_id: string
  cycle_id: string
  cycle_drug_id: string
  week_number: number
  day_of_week: number // 1=Mon ... 7=Sun
  display_value: string | null
  ml_amount: number | null
  is_manual_override: boolean
  is_skipped: boolean
  created_at: string
}

// ==================== Schedule Grid Types ====================
export interface ScheduleGridCell {
  entries: ScheduleCellEntry[]
}

export interface ScheduleCellEntry {
  cycle_drug_id: string
  drug_name: string
  display_value: string
  ml_amount: number | null
  is_manual_override: boolean
  has_error: boolean // ml mismatch with calculated
}

export interface DrugInventoryDelta {
  drug_id: string
  drug_name: string
  category: 'Injectable' | 'Oral' | 'PCT'
  ester_type: EsterType | null
  needed_ml: number         // Injectable: ml; Oral/PCT: total tablets
  needed_vials: number      // Injectable: vials; Oral/PCT: boxes
  current_inventory: number // Injectable: vials; Oral/PCT: total tablets
  tabs_per_box: number | null
  deficit: number // negative = shortage
}

// ==================== Supplies ====================
export type SupplyRuleType = 'per_injection' | 'per_day' | 'per_week' | 'fixed'

export interface Supply {
  id: string
  name: string
  unit: string
  rule_type: SupplyRuleType
  rule_value: number
  is_system: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface CycleSupply {
  id: string
  tenant_id: string
  cycle_id: string
  supply_id: string
  override_quantity: number | null
  created_at: string
}

// Final row passed to export functions: quantity is auto-computed unless overridden.
export interface SupplySummary {
  name: string
  unit: string
  quantity: number
}
