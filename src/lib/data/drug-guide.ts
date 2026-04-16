// ============================================================
// Drug Guide - Static reference data for harm reduction
// ============================================================

// --- Types ---

export interface CycleCompound {
  name: string
  dosage: string
  weeks: string
  frequency: string
}

export interface CycleExample {
  level: '初級' | '初級+' | '中級' | '高級'
  name: string
  goal: string
  duration: string
  compounds: CycleCompound[]
  ai: string
  pct: string
  pctTooltip?: string
  notes: string[]
}

export interface HalfLifeEntry {
  compound: string
  category: '注射型睪酮' | '19-Nor 化合物' | 'DHT 衍生物（注射）' | '口服化合物' | '其他化合物' | '輔助藥物'
  halfLife: string
  frequency: string
  pctWait: string
}

export interface DosageRange {
  compound: string
  category: string
  beginner: string
  intermediate: string
  advanced: string
  unit: string
  notes: string
  tooltip?: string
  source?: string
}

export interface PCTTimingEntry {
  compound: string
  waitTime: string
}

export interface PCTProtocol {
  name: string
  suitability: string
  recommended?: boolean
  drugs: { name: string; dosage: string; duration: string }[]
  notes: string[]
  tooltip?: string
  source?: string
}

export interface AIComparisonEntry {
  name: string
  type: string
  typicalDose: string
  frequency: string
  e2Suppression: string
  lipidImpact: string
  notes: string
  tooltip?: string
  source?: string
}

export interface ProlactinProtocol {
  drug: string
  preventiveDose: string
  therapeuticDose: string
  maxDose: string
  halfLife: string
  notes: string[]
}

export interface DrugInteraction {
  severity: 'danger' | 'caution' | 'safe'
  combo: string
  reason: string
  tooltip?: string
  source?: string
}

export interface CycleSupplement {
  category: string
  name: string
  dosage: string
  purpose: string
  when: string
}

export interface DosingStrategy {
  name: string
  nameEn: string
  description: string
  advantages: string[]
  disadvantages: string[]
  suitability: string
  example?: string
}

// --- Data ---

export const cycleExamples: CycleExample[] = [
  {
    level: '初級',
    name: 'Testosterone Only（首次週期）',
    goal: '建立基線反應，最小化變數',
    duration: '10-12 週',
    compounds: [
      { name: 'Testosterone Enanthate / Cypionate', dosage: '300-500 mg/週', weeks: '1-12', frequency: '每週 2 次（一/四）' },
    ],
    ai: 'Aromasin 12.5mg EOD 或 Arimidex 0.5mg EOD — 僅在雌激素症狀出現時使用',
    pct: '最後一針 2 週後開始：Nolvadex 20mg/天 + Clomid 50mg/天 x 4 週',
    pctTooltip: 'Test E/C 半衰期 7-12 天，等待 2 週（~2 個半衰期）讓血藥濃度降至足夠低再開始 PCT，避免 SERM 與外源荷爾蒙競爭。',
    notes: [
      '預期增重：約 7-9 公斤淨體重',
      '下次週期前休息時間 ≥ 週期 + PCT 長度（最少 16 週）',
      '首次週期建議只用睪酮，以了解個人反應',
    ],
  },
  {
    level: '初級+',
    name: 'Test + Anavar（溫和口服）',
    goal: '在睪酮基礎上加入溫和口服，適合第二次週期',
    duration: '12 週',
    compounds: [
      { name: 'Testosterone E/C', dosage: '400 mg/週', weeks: '1-12', frequency: '每週 2 次' },
      { name: 'Anavar (Oxandrolone)', dosage: '30-50 mg/天', weeks: '1-6 或 7-12', frequency: '每天（分 2 次服用）' },
    ],
    ai: '同初級週期',
    pct: '同初級週期',
    notes: [
      'Anavar 可作為 kickstart（前 6 週）或 finisher（後 6 週）',
      '口服期間必須使用肝臟保護：TUDCA 500mg/天 + NAC 600mg/天',
      'Anavar 是最溫和的口服之一，但仍有肝毒性',
    ],
  },
  {
    level: '中級',
    name: 'Test + Deca（增肌）',
    goal: '經典增肌週期，適合有 1-2 次週期經驗者',
    duration: '14-16 週',
    compounds: [
      { name: 'Testosterone E/C', dosage: '500 mg/週', weeks: '1-14', frequency: '每週 2 次' },
      { name: 'Nandrolone Decanoate (Deca)', dosage: '300-400 mg/週', weeks: '1-12', frequency: '每週 1 次' },
    ],
    ai: 'Arimidex 0.5mg EOD（視需要）',
    pct: '最後一針 Deca 後 3 週開始：聯合方案 x 6 週',
    pctTooltip: 'Deca 半衰期 15 天且代謝物可殘留數月，需等 3 週讓血藥濃度充分下降。含 19-nor 的週期 PCT 建議延長至 6 週。',
    notes: [
      '睪酮劑量應 ≥ Deca 劑量（「Test base」規則）',
      '需備 Cabergoline 0.25mg 2x/週 以防泌乳素升高',
      'Deca 為慢效藥物，需較長週期才能見效',
    ],
  },
  {
    level: '中級',
    name: 'Test + EQ（精瘦增肌）',
    goal: '精瘦增肌，較少水腫',
    duration: '16-20 週',
    compounds: [
      { name: 'Testosterone E/C', dosage: '500 mg/週', weeks: '1-16', frequency: '每週 2 次' },
      { name: 'Boldenone Undecylenate (EQ)', dosage: '400-600 mg/週', weeks: '1-14', frequency: '每週 1-2 次' },
    ],
    ai: '可能需要較少 AI（EQ 具有溫和的 AI 效果）',
    pct: '最後一針 EQ 後 3 週開始',
    notes: [
      'EQ 是極慢效藥物，需 16-20 週才能完整發揮',
      'EQ 可降低 E2，部分使用者甚至會 E2 過低',
      '如出現低 E2 症狀，應減少或停止 AI',
    ],
  },
  {
    level: '中級',
    name: 'Test + NPP + Dbol Kickstart（增肌）',
    goal: '快速啟動的增肌週期',
    duration: '12 週',
    compounds: [
      { name: 'Testosterone E/C', dosage: '500 mg/週', weeks: '1-12', frequency: '每週 2 次' },
      { name: 'NPP (Nandrolone Phenylpropionate)', dosage: '300 mg/週', weeks: '1-10', frequency: 'EOD（100mg/次）' },
      { name: 'Dianabol (Methandienone)', dosage: '30 mg/天', weeks: '1-4', frequency: '每天（分 2-3 次）' },
    ],
    ai: 'Aromasin 12.5mg EOD（Dbol 高度芳香化）',
    pct: '最後一針 NPP 後 5-7 天開始',
    notes: [
      'Dbol 作為 kickstart 僅用 4 週，等待注射劑生效',
      'NPP 比 Deca 清除更快，PCT 可更早開始',
      '需肝臟保護（Dbol 期間）+ 泌乳素控制（NPP）',
    ],
  },
  {
    level: '高級',
    name: 'Test + Tren + Masteron（減脂/重組）',
    goal: '進階減脂或身體重組',
    duration: '8-10 週',
    compounds: [
      { name: 'Testosterone Propionate', dosage: '50-100 mg EOD', weeks: '1-10', frequency: 'EOD' },
      { name: 'Trenbolone Acetate', dosage: '50-75 mg EOD（200-300 mg/週）', weeks: '1-8', frequency: 'EOD' },
      { name: 'Masteron Propionate', dosage: '100 mg EOD（350 mg/週）', weeks: '1-10', frequency: 'EOD' },
    ],
    ai: 'Masteron 具有溫和的抗雌激素效果，可能不需要 AI',
    pct: '最後一針 Tren Ace 後 5-7 天開始',
    notes: [
      'Tren 週期應保持較短（8-10 週）',
      '必須備有 Cabergoline（Tren 為 19-nor 化合物）',
      'Tren 會嚴重影響心肺功能，減少有氧能力',
      '副作用較多：失眠、夜間盜汗、攻擊性增加',
    ],
  },
  {
    level: '高級',
    name: 'Heavy Bulk（重量增肌）',
    goal: '最大化肌肉增長（高劑量、高風險）',
    duration: '16 週',
    compounds: [
      { name: 'Testosterone E', dosage: '750-1000 mg/週', weeks: '1-16', frequency: '每週 2 次' },
      { name: 'Nandrolone Decanoate (Deca)', dosage: '500-600 mg/週', weeks: '1-14', frequency: '每週 1 次' },
      { name: 'Anadrol (Oxymetholone)', dosage: '50-100 mg/天', weeks: '1-4', frequency: '每天 1-2 次' },
    ],
    ai: '此劑量下 AI 和泌乳素控制為必要',
    pct: 'Dr. Scally Power PCT 方案（見 PCT 頁籤）',
    notes: [
      '此為高劑量方案，副作用風險顯著增加',
      'Anadrol 肝毒性極強，嚴格限制 4 週',
      '必須定期監測血壓、血液指標',
      '建議有豐富週期經驗者才使用',
    ],
  },
]

export const halfLifeTable: HalfLifeEntry[] = [
  // 注射型睪酮
  { compound: 'Testosterone Propionate', category: '注射型睪酮', halfLife: '0.8 天（~20 小時）', frequency: '每天或 EOD', pctWait: '3 天' },
  { compound: 'Testosterone Enanthate', category: '注射型睪酮', halfLife: '7-10 天', frequency: '每週 2 次（一/四）', pctWait: '2 週' },
  { compound: 'Testosterone Cypionate', category: '注射型睪酮', halfLife: '10-12 天', frequency: '每週 2 次（一/四）', pctWait: '2 週' },
  { compound: 'Sustanon 250（混合酯）', category: '注射型睪酮', halfLife: '15-18 天（最長酯）', frequency: '每週 1-2 次', pctWait: '2-3 週' },
  { compound: 'Testosterone Undecanoate', category: '注射型睪酮', halfLife: '16.5 天', frequency: '每 10-14 天', pctWait: '3-4 週' },
  // 19-Nor 化合物
  { compound: 'Nandrolone Decanoate (Deca)', category: '19-Nor 化合物', halfLife: '15 天', frequency: '每週 1 次', pctWait: '3 週' },
  { compound: 'NPP (Nandrolone Phenylpropionate)', category: '19-Nor 化合物', halfLife: '4.5 天', frequency: 'EOD', pctWait: '5-7 天' },
  { compound: 'Trenbolone Acetate', category: '19-Nor 化合物', halfLife: '3 天', frequency: 'EOD', pctWait: '5-7 天' },
  { compound: 'Trenbolone Enanthate', category: '19-Nor 化合物', halfLife: '10 天', frequency: '每週 2 次', pctWait: '2 週' },
  // DHT 衍生物（注射）
  { compound: 'Boldenone Undecylenate (EQ)', category: 'DHT 衍生物（注射）', halfLife: '14 天', frequency: '每週 1-2 次', pctWait: '3 週' },
  { compound: 'Masteron Propionate', category: 'DHT 衍生物（注射）', halfLife: '1-2 天', frequency: 'EOD', pctWait: '3 天' },
  { compound: 'Masteron Enanthate', category: 'DHT 衍生物（注射）', halfLife: '~10 天', frequency: '每週 2 次', pctWait: '2 週' },
  { compound: 'Primobolan (Methenolone Enanthate)', category: 'DHT 衍生物（注射）', halfLife: '10.5 天', frequency: '每週 2 次', pctWait: '2 週' },
  // 口服化合物
  { compound: 'Dianabol (Methandienone)', category: '口服化合物', halfLife: '4.5-6 小時', frequency: '每天分 2-3 次', pctWait: '3-5 天' },
  { compound: 'Turinabol', category: '口服化合物', halfLife: '16 小時', frequency: '每天 1-2 次', pctWait: '3-5 天' },
  { compound: 'Halotestin (Fluoxymesterone)', category: '口服化合物', halfLife: '9.2 小時', frequency: '每天分 2 次', pctWait: '3-5 天' },
  { compound: 'Anavar (Oxandrolone)', category: '口服化合物', halfLife: '9 小時', frequency: '每天分 2 次', pctWait: '3-5 天' },
  { compound: 'Winstrol (Stanozolol)', category: '口服化合物', halfLife: '9 小時', frequency: '每天分 2 次', pctWait: '3-5 天' },
  { compound: 'Anadrol (Oxymetholone)', category: '口服化合物', halfLife: '8-9 小時', frequency: '每天 1-2 次', pctWait: '3-5 天' },
  { compound: 'Superdrol (Methasterone)', category: '口服化合物', halfLife: '8-12 小時', frequency: '每天分 2 次', pctWait: '3-5 天' },
  { compound: 'Proviron (Mesterolone)', category: '口服化合物', halfLife: '12-13 小時', frequency: '每天 1-2 次', pctWait: '3-5 天' },
  { compound: 'M1T (Methyl-1-Testosterone)', category: '口服化合物', halfLife: '5 小時', frequency: '每天分 2-3 次', pctWait: '3-5 天' },
  // 其他化合物
  { compound: 'Clenbuterol', category: '其他化合物', halfLife: '1.5 天（36 小時）', frequency: '每天 1 次', pctWait: 'N/A' },
  { compound: 'T3 (Liothyronine)', category: '其他化合物', halfLife: '10 小時', frequency: '每天 1 次或分次', pctWait: 'N/A' },
  { compound: 'T4 (Levothyroxine)', category: '其他化合物', halfLife: '6-7 天', frequency: '每天 1 次', pctWait: 'N/A' },
  // 輔助藥物
  { compound: 'Tamoxifen (Nolvadex)', category: '輔助藥物', halfLife: '5-7 天', frequency: '每天 1 次', pctWait: 'N/A' },
  { compound: 'Clomiphene (Clomid)', category: '輔助藥物', halfLife: '5 天', frequency: '每天 1 次', pctWait: 'N/A' },
  { compound: 'Toremifene (Fareston)', category: '輔助藥物', halfLife: '5 天', frequency: '每天 1 次', pctWait: 'N/A' },
  { compound: 'Anastrozole (Arimidex)', category: '輔助藥物', halfLife: '2 天', frequency: 'EOD', pctWait: 'N/A' },
  { compound: 'Letrozole (Femara)', category: '輔助藥物', halfLife: '2 天', frequency: 'EOD 或 E3D', pctWait: 'N/A' },
  { compound: 'Exemestane (Aromasin)', category: '輔助藥物', halfLife: '24 小時', frequency: 'EOD', pctWait: 'N/A' },
  { compound: 'Cabergoline (Dostinex)', category: '輔助藥物', halfLife: '63-69 小時（~3 天）', frequency: '每週 2 次', pctWait: 'N/A' },
  { compound: 'Pramipexole (Mirapex)', category: '輔助藥物', halfLife: '8-12 小時', frequency: '每天 1 次', pctWait: 'N/A' },
  { compound: 'HCG', category: '輔助藥物', halfLife: '24-36 小時', frequency: '每週 2-3 次', pctWait: 'N/A' },
]

export const dosageRanges: DosageRange[] = [
  // 注射型睪酮
  { compound: 'Testosterone E/C', category: '注射型', beginner: '300-500', intermediate: '500-750', advanced: '750-1000+', unit: 'mg/週', notes: '首次週期建議 300-500mg' },
  { compound: 'Testosterone Propionate', category: '注射型', beginner: '300-500', intermediate: '500-700', advanced: '700-1000', unit: 'mg/週', notes: '需每天或 EOD 注射' },
  // 19-Nor
  { compound: 'Nandrolone Decanoate (Deca)', category: '注射型', beginner: '200-300', intermediate: '300-500', advanced: '500-700', unit: 'mg/週', notes: '劑量勿超過睪酮' },
  { compound: 'NPP', category: '注射型', beginner: '200-300', intermediate: '300-400', advanced: '400-600', unit: 'mg/週', notes: '比 Deca 清除更快' },
  { compound: 'Trenbolone Acetate', category: '注射型', beginner: '150-200', intermediate: '200-350', advanced: '350-500', unit: 'mg/週', notes: '副作用強烈，謹慎使用' },
  { compound: 'Trenbolone Enanthate', category: '注射型', beginner: '150-200', intermediate: '200-400', advanced: '400-600', unit: 'mg/週', notes: '同 Tren Ace 但長效' },
  // DHT
  { compound: 'Boldenone (EQ)', category: '注射型', beginner: '300-400', intermediate: '400-600', advanced: '600-900', unit: 'mg/週', notes: '極慢效，需 16+ 週' },
  { compound: 'Masteron Propionate', category: '注射型', beginner: '200-300', intermediate: '300-400', advanced: '400-600', unit: 'mg/週', notes: '有輕微抗雌效果' },
  { compound: 'Primobolan', category: '注射型', beginner: '400', intermediate: '600-700', advanced: '800-1000', unit: 'mg/週', notes: '溫和，需較高劑量才有效', tooltip: 'Methenolone Enanthate 的雄激素:合成代謝比為 1:2~1:3（Wikipedia），合成代謝效力相對低，不芳香化、無肝毒性、SHBG 親和力僅約睪酮的 16%。因效力低，需要較高劑量：初級 400mg/週為有效起點，中級常在 600-700mg 範圍，高級 800-1000mg+。臨床研究中乳癌治療曾使用 400-1200mg/週（Kennedy & Yarbro, 1968）。副作用極溫和，即使高劑量也相對安全。', source: 'Wikipedia — Metenolone; PubMed PMID:4952912; Steroidal.com — Primobolan Doses' },
  // 口服
  { compound: 'Dianabol (Dbol)', category: '口服', beginner: '20-30', intermediate: '30-50', advanced: '50-80', unit: 'mg/天', notes: '限 4-6 週，高度芳香化' },
  { compound: 'Anavar (Oxandrolone)', category: '口服', beginner: '20-30', intermediate: '30-50', advanced: '50-80', unit: 'mg/天', notes: '最溫和的口服之一' },
  { compound: 'Winstrol (Stanozolol)', category: '口服', beginner: '25-30', intermediate: '30-50', advanced: '50-75', unit: 'mg/天', notes: '關節乾燥風險，限 4-6 週' },
  { compound: 'Anadrol (Oxymetholone)', category: '口服', beginner: '25-50', intermediate: '50-100', advanced: '100-150', unit: 'mg/天', notes: '極強效，肝毒性高' },
  { compound: 'Turinabol', category: '口服', beginner: '20-30', intermediate: '30-50', advanced: '50-80', unit: 'mg/天', notes: '溫和，不芳香化' },
  { compound: 'Superdrol', category: '口服', beginner: '10', intermediate: '10-20', advanced: '20-30', unit: 'mg/天', notes: '極高肝毒性，嚴格限 3-4 週' },
  { compound: 'Halotestin', category: '口服', beginner: '10-20', intermediate: '20-30', advanced: '30-40', unit: 'mg/天', notes: '力量增強為主，肝毒性高' },
  { compound: 'Proviron', category: '口服', beginner: '25-50', intermediate: '50-75', advanced: '75-100', unit: 'mg/天', notes: '輕微抗雌，可長期使用' },
]

export const bodyWeightGuidance = {
  title: '體重與劑量參考',
  description: '目前沒有廣泛接受的 mg/kg 劑量標準。以下為一般性原則：',
  ranges: [
    { level: '臨床 TRT', mgPerKgPerWeek: '1-3', example: '75-200 mg/週（一般男性）' },
    { level: '初級超生理劑量', mgPerKgPerWeek: '3-6', example: '300-500 mg/週（80-90kg 男性）' },
    { level: '中級', mgPerKgPerWeek: '5-8', example: '總 AAS 負載' },
    { level: '高級', mgPerKgPerWeek: '8-15+', example: '總 AAS 負載（風險更高）' },
  ],
  principles: [
    '體重 <75kg 者應從劑量範圍低端開始',
    '體重 >100kg 者可能需要稍高劑量',
    '個體反應差異極大（基因、雄激素受體密度、芳香化酶活性）',
    '「最低有效劑量」原則是最安全的方法 — 從低劑量開始，評估反應，再調整',
  ],
}

export const dosingStrategies: DosingStrategy[] = [
  {
    name: '固定劑量',
    nameEn: 'Constant Dosing',
    description: '整個週期使用相同劑量。血藥濃度在前幾次注射後達到穩態並維持穩定。',
    advantages: [
      '簡單可預測 — 容易管理和追蹤效果',
      '穩態血藥濃度穩定，副作用可預測',
      '最容易評估個人對某劑量的反應',
    ],
    disadvantages: [
      '達到穩態需要數個半衰期（長酯化合物需 4-6 週）',
      '無法根據週期階段調整需求',
    ],
    suitability: '所有使用者，特別是初級者。這是最推薦的默認方案。',
    example: 'Testosterone Enanthate 500mg/週，第 1-12 週不變',
  },
  {
    name: '金字塔式',
    nameEn: 'Pyramid Dosing',
    description: '劑量從低開始遞增至峰值，然後在週期末遞減回低劑量。這是一種較舊的方法，現在多數專家不再推薦。',
    advantages: [
      '理論上逐步適應可減少初期副作用衝擊',
      '遞減階段理論上可「過渡」到 PCT',
    ],
    disadvantages: [
      '沒有科學依據支持遞減有助於 HPTA 恢復',
      '峰值劑量時間短，有效高劑量暴露時間不足',
      '遞減不等於 PCT — 任何超生理劑量都會抑制 HPTA',
      '血藥濃度波動大，難以管理副作用',
    ],
    suitability: '不推薦。舊派方法，已被現代方案淘汰。',
    example: '第 1-3 週 250mg → 第 4-8 週 500mg → 第 9-12 週 250mg',
  },
  {
    name: '前置劑量',
    nameEn: 'Frontloading',
    description: '首週（或首 1-2 次注射）使用雙倍劑量，之後恢復正常劑量。目的是更快達到穩態血藥濃度，跳過長酯化合物的「啟動期」。',
    advantages: [
      '將達到穩態的時間從 4-6 週縮短至 1-2 週',
      '更快感受到化合物效果',
      '對長酯化合物（如 EQ、Deca）特別有用',
    ],
    disadvantages: [
      '初期副作用更強烈（因為血藥濃度快速升高）',
      '更高的芳香化風險 — 可能需要更早和更積極的 AI 管理',
      '不適合首次使用某化合物的人（無法評估正常劑量反應）',
      '注射量較大可能造成注射部位不適',
    ],
    suitability: '中級以上使用者，且已熟悉該化合物在正常劑量下的反應。常用於 EQ 和 Deca。',
    example: 'EQ 第 1 週 800mg（frontload）→ 第 2-16 週 400mg/週',
  },
  {
    name: '遞減式 / 巡航',
    nameEn: 'Tapering / Blast & Cruise',
    description: '週期末將劑量降至 TRT 水平（100-200mg/週 Test）而非完全停藥。在高劑量（blast）和維持劑量（cruise）之間交替，不做 PCT。',
    advantages: [
      '避免 PCT 的不適和恢復期',
      '維持穩定的荷爾蒙環境，減少波動',
      '適合長期 AAS 使用者或不打算完全恢復自然產生的使用者',
    ],
    disadvantages: [
      '承諾長期外源荷爾蒙替代 — 自然 HPTA 可能永久受損',
      '即使 TRT 劑量也有長期心血管和代謝風險',
      '需要持續監測血液指標',
      '不適合想要保留自然恢復選項的使用者',
    ],
    suitability: '僅限已決定長期使用 AAS 且不計劃 PCT 恢復的高級使用者。需要醫療監督。',
    example: 'Blast: Test 500mg/週 x 16 週 → Cruise: Test 150mg/週 x 8-12 週 → 下一次 Blast',
  },
]

export const dosingStrategyKeyPoints: string[] = [
  '初級者應始終使用固定劑量 — 簡單、可預測、易於評估反應',
  '前置劑量僅適合已熟悉該化合物正常反應的有經驗使用者',
  '金字塔式劑量缺乏科學依據，不建議使用',
  '遞減/巡航是一種生活方式選擇，而非週期策略 — 意味著放棄自然恢復',
]

export const pctTimingTable: PCTTimingEntry[] = [
  { compound: 'Testosterone Propionate', waitTime: '3 天' },
  { compound: 'Testosterone Enanthate / Cypionate', waitTime: '2 週' },
  { compound: 'Sustanon 250', waitTime: '2-3 週' },
  { compound: 'Testosterone Undecanoate', waitTime: '3-4 週' },
  { compound: 'Nandrolone Decanoate (Deca)', waitTime: '3 週' },
  { compound: 'NPP', waitTime: '5-7 天' },
  { compound: 'Trenbolone Acetate', waitTime: '5-7 天' },
  { compound: 'Trenbolone Enanthate', waitTime: '2 週' },
  { compound: 'Boldenone (EQ)', waitTime: '3 週' },
  { compound: '純口服週期', waitTime: '最後一劑後 3-5 天' },
]

export const pctProtocols: PCTProtocol[] = [
  {
    name: 'Nolvadex + Clomid 聯合方案（推薦）',
    suitability: '所有週期（標準推薦）',
    recommended: true,
    drugs: [
      { name: 'Nolvadex (Tamoxifen)', dosage: '20 mg/天', duration: '共 6 週' },
      { name: 'Clomid (Clomiphene)', dosage: '50 mg/天', duration: '前 2-4 週（與 Nolvadex 同時開始）' },
    ],
    notes: [
      '聯合方案為首選 — 兩者作用機制互補，效益大於單用',
      'Clomid 提供初始強力 FSH/LH 峰值推動恢復啟動',
      'Nolvadex 提供持續穩定的垂體 LH 刺激並改善 GnRH 敏感度',
      '含 19-nor（Deca/Tren）的週期建議至少 6 週',
      '輕度 Test-only 週期可縮短至 4 週',
    ],
    tooltip: 'Clomid 產生較強的初始 FSH/LH 峰值但長期會降低垂體敏感度；Nolvadex 研究顯示持續使用可增強垂體對 LHRH 的 LH 反應。兩者互補：Clomid 啟動 + Nolvadex 維持，效益遠大於單用。',
    source: 'Fertility & Sterility — Hormonal Effects of Tamoxifen in Oligospermic Men',
  },
  {
    name: 'Nolvadex 單用方案（替代）',
    suitability: '輕度週期或無法取得 Clomid 時',
    drugs: [
      { name: 'Nolvadex (Tamoxifen)', dosage: '20 mg/天', duration: '共 4-6 週' },
    ],
    notes: [
      '20mg 已接近最大 SERM 效果，副作用較 Clomid 少',
      '適合 Test-only ≤12 週的輕度週期',
      '如需加強可改用 40mg/天 x 2 週 → 20mg/天 x 4 週',
    ],
    tooltip: '新社群共識傾向平坦 20mg 而非 40/20 遞減。Nolvadex 半衰期長（5-7 天），20mg 即可提供接近最大的 SERM 效果。40mg 初始劑量可加速達到穩態但增加副作用（視覺、情緒），不成比例提升恢復效果。',
    source: 'r/steroids Wiki PCT Guidelines',
  },
  {
    name: 'Dr. Scally Power PCT（黃金標準）',
    suitability: '重度/長期週期',
    drugs: [
      { name: 'HCG', dosage: '2500 IU EOD', duration: '共 16 天（8 劑）' },
      { name: 'Clomid', dosage: '50 mg/天', duration: '共 30 天' },
      { name: 'Nolvadex', dosage: '20 mg/天', duration: '共 45 天' },
    ],
    notes: [
      '三者同時使用，HCG 階段為前 16 天，SERM 持續至完成',
      'Dr. Scally 臨床研究：19 名男性中 100% 在 45 天內恢復睪酮',
      '原始方案 Clomid 為 100mg，現社群多建議降至 50mg 以減少副作用',
      '適合長期或高劑量週期，總 PCT 時長約 6-7 週',
    ],
    tooltip: '此方案包含 HCG（直接刺激 Leydig 細胞）+ 雙 SERM（刺激垂體 LH/FSH），三管齊下覆蓋 HPTA 軸所有層級。臨床研究 100% 成功率。',
    source: 'Dr. Michael Scally — ASIH 臨床研究',
  },
]

export const hcgOnCycleProtocol = {
  title: 'HCG On-Cycle 方案（推薦）',
  dosage: '250-500 IU，每週 2-3 次',
  timing: '整個週期期間使用',
  benefits: [
    '防止週期中睪丸萎縮',
    '使 PCT 恢復更快',
    '研究顯示 500 IU EOD 可維持睪丸內睪酮在基線或以上',
  ],
  warnings: [
    { text: '不要在 PCT 期間使用 HCG（會透過負反饋抑制 LH）', tooltip: 'HCG 模擬 LH 直接刺激 Leydig 細胞，同時在垂體層級透過負反饋抑制內源 LH 分泌。PCT 的目標是恢復內源 LH，因此 HCG 應在 PCT SERM 開始前完成。' },
    { text: 'On-cycle 維護建議 250-500 IU/次；高於 500 IU 會增加芳香化', tooltip: '研究顯示 250 IU EOD 足以維持睪丸內睪酮。更高劑量主要增加芳香化（HCG 刺激睪丸芳香化酶），導致 E2 升高需要額外 AI 管理。' },
    { text: '短期高劑量 PCT 方案（如 Scally 2500 IU EOD x 16 天）有臨床文獻支持', tooltip: '臨床生育治療常用 1500-5000 IU 2-3x/週持續數月。短期高劑量在有限時間內脫敏風險低。', source: 'PMC — HCG for Infertility Management (PMC6087849)' },
    { text: '長期持續高劑量可能有 Leydig 細胞 LH 受體下調風險', tooltip: '主要來自動物研究（Menon et al.），人體證據較不明確。間歇性給藥允許受體恢復，因此 On-cycle 2-3x/週的間歇方案優於每日使用。' },
  ],
  importantNotes: [
    '務必做週期前血液檢查以建立基線',
    '在 PCT 結束後 4-6 週做血檢確認恢復',
    '「週期時間 + PCT = 休息時間」規則',
  ],
}

export const aiComparison: AIComparisonEntry[] = [
  {
    name: 'Anastrozole (Arimidex)',
    type: '可逆性，非類固醇型',
    typicalDose: '0.5 mg',
    frequency: 'EOD',
    e2Suppression: '~50%（0.5mg），96%+（1mg）',
    lipidImpact: '負面（升高 LDL）',
    notes: '最常見；突然停藥會反彈',
    tooltip: '可逆性 AI 在停藥後不再佔據芳香化酶，被抑制的酶立即恢復活性，加上積壓的基質快速轉化為雌激素，造成 E2 反彈。需緩慢減量而非突然停藥。',
    source: 'NCBI — Aromatase Inhibitors (NBK557856)',
  },
  {
    name: 'Exemestane (Aromasin)',
    type: '自殺性（不可逆）',
    typicalDose: '12.5 mg',
    frequency: 'EOD',
    e2Suppression: '劑量依賴型',
    lipidImpact: '中性/輕微正面',
    notes: '首選 — 無反彈；輕微雄激素性',
    tooltip: '自殺性 AI 永久結合並摧毀芳香化酶分子，停藥後 E2 恢復需等待身體合成新酶（數天），因此無反彈。Aromasin 本身具有輕微雄激素活性，對脂質影響中性甚至輕微正面。',
    source: 'PMC — AI Musculoskeletal Pain (PMC8935546)',
  },
  {
    name: 'Letrozole (Femara)',
    type: '可逆性，非類固醇型',
    typicalDose: '0.5-1.0 mg',
    frequency: 'EOD',
    e2Suppression: '極強（>95%）',
    lipidImpact: '負面',
    notes: '僅限緊急使用（活性女乳症）；日常使用太強',
    tooltip: 'Letrozole 在 2.5mg 下可將 E2 抑制 >98%，極容易導致 E2 崩潰。僅在活性女乳症（已可觸摸到組織增生）時短期使用數天，然後轉為 Aromasin 維持。',
    source: 'NCBI — Aromatase Inhibitors',
  },
]

export const estrogenSymptoms = {
  high: {
    title: '高雌激素（E2）症狀',
    symptoms: [
      '水腫 / 浮腫 / 臉部浮腫',
      '乳頭敏感、壓痛或發癢（早期女乳症警訊）',
      '女乳症（乳腺組織增生）',
      '血壓升高',
      '情緒波動、情緒化、易哭',
      '性慾下降 / 勃起障礙',
      '體脂增加（尤其腰部）',
      '痤瘡',
    ],
  },
  low: {
    title: '低雌激素（E2 崩潰）症狀 — AI 過量',
    symptoms: [
      '關節疼痛、卡卡、乾燥（雌激素維持關節潤滑）',
      '皮膚乾燥、嘴唇乾裂、眼睛乾澀',
      '疲勞、嗜睡',
      '抑鬱、情緒平淡、焦慮',
      '性慾低下、勃起障礙',
      '失眠 / 睡眠困難',
      '食慾下降',
      '肌肉飽滿度下降（扁平感）',
    ],
  },
}

export const aiProtocolRecommendations = [
  { scenario: 'Test 300-500 mg/週', recommendation: 'Aromasin 12.5mg EOD 或 Arimidex 0.5mg EOD — 僅在症狀出現時' },
  { scenario: 'Test 500-750 mg/週 + 芳香化化合物', recommendation: '可能需要 Aromasin 12.5mg ED 或 Arimidex 0.5mg ED' },
  { scenario: '緊急女乳症逆轉', recommendation: 'Letrozole 2.5mg 數天，然後轉 Aromasin/Arimidex' },
]

export const aiKeyPoints = [
  '不要預防性使用 AI — 等症狀出現再用',
  '目標：E2 維持在正常偏高範圍（20-30 pg/mL），不要崩潰',
  'E2 對肌肉生長、骨骼健康、性慾和情緒都很重要',
  '部分使用者在 500mg Test/週 可能完全不需要 AI',
  'Aromasin 為首選（自殺性 AI、脂質中性、無反彈）',
]

// --- Clenbuterol & T3 Protocols ---

export interface ClenProtocol {
  name: string
  description: string
  schedule: string[]
  dosageRange: { gender: string; start: string; max: string }[]
  sideEffects: string[]
  notes: string[]
  advantages?: string[]
  disadvantages?: string[]
}

export interface ClenOverview {
  mechanism: string
  advantages: string[]
  disadvantages: string[]
  contraindications: string[]
}

export interface T3Protocol {
  name: string
  description: string
  dosageRange: string
  rampUp: string
  maintain: string
  taperDown: string
  duration: string
  notes: string[]
}

export const clenProtocols: ClenProtocol[] = [
  {
    name: '2 週開 / 2 週關（標準方案）',
    description: 'Beta-2 受體在持續使用約 14 天後會下調，降低效果。交替使用可維持藥效。',
    schedule: [
      '第 1-2 週：Clen ON — 從低劑量開始，每 2-3 天增加 20mcg 至目標劑量',
      '第 3-4 週：Clen OFF（或搭配 Ketotifen 1-2mg/天以上調受體）',
      '第 5-6 週：Clen ON — 從前次最高劑量恢復',
      '第 7-8 週：Clen OFF',
      '可重複 4-8 週，視需要而定',
    ],
    dosageRange: [
      { gender: '男性', start: '20-40 mcg/天', max: '120-140 mcg/天' },
      { gender: '女性', start: '10-20 mcg/天', max: '80-100 mcg/天' },
    ],
    sideEffects: [
      '手部震顫（最常見，通常第 3-4 天適應）',
      '心跳加速（靜息心率應控制在 100 bpm 以下）',
      '肌肉抽筋（補充 Taurine 3-5g/天 + 鉀）',
      '失眠（建議早上服用）',
      '出汗增加',
    ],
    notes: [
      '不要與其他興奮劑（麻黃鹼、DMAA）合用 — 心律不整風險',
      '每 2-3 天增加 20mcg，直到達到個人可接受的最高劑量',
      '如果靜息心率 >100bpm 或出現嚴重震顫，應降低劑量',
    ],
    advantages: [
      '受體有恢復時間，每次重新開始時效果完整',
      '累積心臟壓力較低（有定期休息）',
      '方案簡單，無需額外藥物',
      '適合首次使用 Clen 的使用者',
    ],
    disadvantages: [
      '關閉期間失去脂肪燃燒加速效果',
      '頻繁的開/關過渡期可能影響訓練穩定性',
      '每次重新開始可能再次經歷初期副作用（震顫等）',
    ],
  },
  {
    name: '持續遞增方案（搭配 Ketotifen）',
    description: '從低劑量開始逐步升高，搭配 Ketotifen 上調 Beta-2 受體以延長持續使用時間。適合偏好不中斷的使用者。',
    schedule: [
      '第 1-2 週：20-40 mcg/天',
      '第 3-4 週：60-80 mcg/天',
      '第 5-6 週：80-100 mcg/天',
      '第 7-8 週：100-120 mcg/天（最高劑量）',
      '每 2-3 週增加 ~20 mcg，隨耐受性調整',
      'Ketotifen 2-3mg/天（睡前服用）— 從第 2 週起持續使用',
    ],
    dosageRange: [
      { gender: '男性', start: '20-40 mcg/天', max: '120-140 mcg/天' },
      { gender: '女性', start: '10-20 mcg/天', max: '80-100 mcg/天' },
    ],
    sideEffects: [
      '手部震顫（最常見，通常第 3-4 天適應）',
      '心跳加速（靜息心率應控制在 100 bpm 以下）',
      '肌肉抽筋（補充 Taurine 3-5g/天 + 鉀）',
      '失眠（建議早上服用）',
      '出汗增加',
      '嗜睡（Ketotifen 副作用，建議睡前服用）',
    ],
    notes: [
      '總時長 8-12 週持續使用',
      'Ketotifen 為抗組織胺藥物，可上調 Beta-2 受體以對抗 Clen 引起的受體下調',
      'PubMed 研究證實 Ketotifen + Clen 可增加 Beta 腎上腺素受體功能',
    ],
    advantages: [
      '持續脂肪燃燒效果，無中斷期',
      '效果更平穩，減少開/關過渡帶來的波動',
      'Ketotifen 上調受體可延長有效使用時間',
    ],
    disadvantages: [
      '累積心臟壓力較高 — 長時間持續刺激心血管系統',
      '需額外使用 Ketotifen（增加藥物複雜度和嗜睡副作用）',
      '後期高劑量效益遞減 — 達到天花板後無法再升高',
    ],
  },
]

export const clenOverview: ClenOverview = {
  mechanism: 'Clenbuterol 是選擇性 Beta-2 腎上腺素受體激動劑，最初用於治療哮喘。它通過激活 Beta-2 受體來增加基礎代謝率和核心體溫（產熱效應），促進脂肪細胞中的脂肪分解。Clen 不是合成代謝類固醇，不影響 HPTA 軸，不需要 PCT。',
  advantages: [
    '顯著增加基礎代謝率（約 10-15%），加速脂肪燃燒',
    '具有溫和的抗分解代謝作用 — 減脂期間有助於保留肌肉',
    '可能具有輕微的食慾抑制效果',
    '不影響 HPTA 軸，不需要 PCT',
    '不芳香化，不引起水腫或雌激素相關副作用',
    '口服方便，半衰期長（~36 小時），每天一次即可',
  ],
  disadvantages: [
    '心臟壓力：升高心率和血壓，長期使用可能導致心肌肥大',
    'Beta-2 受體下調：持續使用 ~14 天後效果減弱，需循環使用或搭配 Ketotifen',
    '副作用明顯：震顫、心悸、失眠、肌肉抽筋（鉀/牛磺酸流失）',
    '減脂效果有上限 — 不能替代良好的飲食和有氧計畫',
    '個體差異大 — 部分使用者對低劑量即有強烈反應',
    '長期安全數據有限（動物研究顯示心肌毒性，人體研究不足）',
  ],
  contraindications: [
    '心臟疾病、心律不整、高血壓患者禁用',
    '不可與其他興奮劑合用（麻黃鹼、DMAA、高劑量咖啡因）— 心律不整風險',
    '甲狀腺功能亢進者禁用',
    '使用期間需監測靜息心率（應 <100 bpm）和血壓',
    '如出現持續性心悸、胸痛或嚴重頭痛，應立即停藥',
    '建議使用期間補充 Taurine 3-5g/天（防止肌肉抽筋）+ 鉀 + 鎂',
  ],
}

export const t3Protocols: T3Protocol[] = [
  {
    name: '標準減脂 T3 週期',
    description: 'T3 增加基礎代謝率，加速脂肪燃燒。必須緩慢增減劑量以保護甲狀腺功能。',
    dosageRange: '25-75 mcg/天',
    rampUp: '從 25mcg/天開始，每 5-7 天增加 12.5-25mcg 至目標劑量',
    maintain: '在目標劑量維持 4-6 週',
    taperDown: '以相反順序遞減：每 5-7 天減少 12.5-25mcg，回到 25mcg 後停藥',
    duration: '總計 6-8 週（含增減劑量期），最長 12 週',
    notes: [
      '不可突然停藥 — T3 會抑制 TSH，突然停藥導致暫時性甲狀腺功能低下（極度疲勞、體重增加、腦霧、怕冷、抑鬱）',
      '緩慢遞減讓 HPT 軸（下視丘-垂體-甲狀腺）逐漸恢復',
      '劑量 >50mcg/天 會增加肌肉分解風險 — 強烈建議同時使用 AAS（至少 TRT 劑量）以保護肌肉',
      '保守劑量 25-50mcg 適合大多數使用者',
      '75mcg+ 為激進劑量，肌肉流失風險顯著',
    ],
  },
]

export const clenT3StackProtocol = {
  title: 'Clen + T3 聯合減脂方案',
  description: 'Clen（Beta-2 興奮劑）與 T3（甲狀腺素）協同作用。T3 增加 Beta 受體數量，可能增強 Clen 效果。',
  schedule: [
    { weeks: '1-2', clen: '從 20mcg 遞增至 80-120mcg', t3: '從 25mcg 遞增至 50mcg' },
    { weeks: '3-4', clen: 'OFF（或搭配 Ketotifen）', t3: '維持 50mcg' },
    { weeks: '5-6', clen: 'ON（從前次最高劑量恢復）', t3: '維持 50mcg' },
    { weeks: '7-8', clen: 'OFF', t3: '遞減 50→25→停藥' },
  ],
  notes: [
    '強烈建議同時使用 AAS（至少 TRT 劑量的睪酮）以防止 T3 造成的肌肉分解',
    '兩者都會升高心率 — 密切監測',
    '充足水分攝取 + Taurine 3-5g/天 + 電解質補充',
  ],
}

export const prolactinProtocols: ProlactinProtocol[] = [
  {
    drug: 'Cabergoline (Dostinex)',
    preventiveDose: '0.25 mg，每週 2 次',
    therapeuticDose: '0.5 mg，每週 2 次',
    maxDose: '1 mg，每週 2 次',
    halfLife: '63-69 小時（~3 天）',
    notes: [
      '首選藥物 — 更有效、耐受性更好',
      '長半衰期，給藥方便',
      '透過激活多巴胺 D2 受體抑制泌乳素分泌',
    ],
  },
  {
    drug: 'Pramipexole (Mirapex)',
    preventiveDose: '0.125 mg/天（睡前）',
    therapeuticDose: '0.25-0.5 mg/天',
    maxDose: '0.5 mg/天',
    halfLife: '8-12 小時',
    notes: [
      '替代選擇 — 比 Cabergoline 便宜',
      '需每天服藥',
      '副作用較多：噁心、頭暈、嗜睡、強迫行為',
    ],
  },
]

export const prolactinKeyPoints = [
  '使用 19-nor 化合物（Deca、NPP、Trenbolone）時必須控制泌乳素',
  '這些化合物具有孕激素活性，可升高泌乳素',
  '泌乳素升高導致：「Deca Dick」（勃起障礙）、溢乳、女乳症、性慾低下',
  '開始使用 19-nor 前應做基線泌乳素血液檢查',
  '使用 Tren 或 Deca 時預防性服用 Caber 0.25mg 2x/週',
  'Vitamin B6（P-5-P 型，50-100mg/天）可輕微降低泌乳素',
  'Vitamin E 400 IU/天 也有輔助效果',
]

export const drugInteractions: DrugInteraction[] = [
  // 禁止
  { severity: 'danger', combo: '多種 C17-aa 口服同時使用', reason: '肝毒性疊加（如 Dbol + Anadrol、Winstrol + Superdrol）極度危險', tooltip: 'C17-alpha 烷基化修飾使口服類固醇能通過肝臟首過效應而不被代謝，但代價是直接的肝細胞毒性。多種 C17-aa 同時使用會使肝酶（AST/ALT）急劇升高，嚴重可導致膽汁淤積性肝炎。', source: 'PMC — AAS-Induced Liver Injury (PMC9331524)' },
  { severity: 'danger', combo: 'Trenbolone + Halotestin', reason: '兩者皆為極端化合物，心血管和肝臟壓力嚴重' },
  { severity: 'danger', combo: '多種 19-nor 化合物同時使用', reason: 'Tren + Deca：極度抑制、泌乳素問題疊加、恢復困難', tooltip: '19-nor 化合物的代謝物（如 Nandrolone 的 19-norandrosterone）可在體內殘留長達 18 個月，持續抑制 HPTA。兩種 19-nor 同時使用使泌乳素問題和 HPTA 抑制疊加，PCT 恢復極為困難。', source: 'PMC — Harm Reduction in Male AAS Users (PMC8298654)' },
  { severity: 'danger', combo: '長期 Letrozole + 高強度訓練', reason: 'E2 崩潰導致關節受傷風險' },
  // 謹慎
  { severity: 'caution', combo: '口服超過 6 週', reason: '肝毒性風險顯著增加' },
  { severity: 'caution', combo: 'Superdrol（任何劑量）', reason: '最強肝毒性口服之一' },
  { severity: 'caution', combo: 'Winstrol + 關節密集訓練', reason: 'Winstrol 使關節乾燥，增加受傷風險' },
  { severity: 'caution', combo: 'Clenbuterol + 興奮劑', reason: '心律不整風險（麻黃鹼、DMAA）' },
  { severity: 'caution', combo: 'T3 高劑量 >75mcg 長期', reason: '可導致肌肉流失和甲狀腺損傷' },
  { severity: 'caution', combo: 'Trenbolone + 高強度有氧（HIIT）', reason: 'Tren 顯著降低有氧能力（呼吸困難、心率升高）。但低強度有氧（LISS 30-45 分鐘，3-5x/週）強烈建議使用，以減輕 Tren 的心血管負面影響（血脂異常、心肌肥大、高血壓）。應使用心率監測而非配速目標來調整強度' },
  // 安全搭配
  { severity: 'safe', combo: 'Test + Deca', reason: '經典增肌：Test 基底覆蓋 Deca 可能抑制的性慾/情緒' },
  { severity: 'safe', combo: 'Test + EQ', reason: '精瘦增肌：EQ 有溫和 AI 效果' },
  { severity: 'safe', combo: 'Test + Primobolan', reason: '高品質精瘦增重，副作用溫和' },
  { severity: 'safe', combo: 'Test + Masteron', reason: '減脂切割：Mast 有抗雌激素特性' },
  { severity: 'safe', combo: 'Test + Anavar', reason: '溫和搭配，適合進階初級者' },
  { severity: 'safe', combo: 'Test + Tren + Masteron', reason: '進階減脂三合一（需經驗豐富）' },
  { severity: 'safe', combo: '任何注射 + 短期口服 kickstart', reason: '口服 4-6 週等待注射劑生效' },
]

// --- Multi-Compound Stacking Guidelines ---

export interface MultiCompoundStack {
  name: string
  goal: string
  compounds: { name: string; dosageRange: string; notes: string }[]
  keyPoints: string[]
}

export const multiCompoundStacks: MultiCompoundStack[] = [
  {
    name: 'Test + EQ + Tren（進階重組/增肌）',
    goal: '精瘦增肌或身體重組，三種不同機制協同',
    compounds: [
      { name: 'Testosterone E/C', dosageRange: '200-500 mg/週', notes: 'EQ 有溫和 AI 效果，如 Test 過低可能導致 E2 過低；需根據血檢調整' },
      { name: 'Boldenone (EQ)', dosageRange: '400-600 mg/週', notes: '極慢效，需 16-20 週；其代謝物有 AI 效果' },
      { name: 'Trenbolone Acetate', dosageRange: '200-300 mg/週', notes: 'Tren 在 200-300mg 已很有效，不需要加到很高' },
    ],
    keyPoints: [
      '這是非常嚴苛的組合 — EQ 和 Tren 都對心血管負面影響大',
      'EQ 的 AI 效果 + Tren 不芳香化 → 注意低 E2 風險，可能需要提高 Test 劑量',
      '必須定期監測血液指標（血脂、肝腎功能、血球計數）',
      '強烈建議 LISS 有氧 30-45 分鐘/天',
    ],
  },
  {
    name: 'Test + Deca + Dbol（經典黃金時代增肌）',
    goal: '最大化肌肉體積增長',
    compounds: [
      { name: 'Testosterone E/C', dosageRange: '500 mg/週', notes: 'Test ≥ Deca 以避免「Deca Dick」— DHN 會在陰莖組織取代 DHT' },
      { name: 'Nandrolone Decanoate (Deca)', dosageRange: '300-400 mg/週', notes: '更高劑量增加泌乳素問題' },
      { name: 'Dianabol', dosageRange: '25-50 mg/天 x 4-6 週', notes: '作為 kickstart；Deca 和 Test E/C 需 4-6 週達到穩態' },
    ],
    keyPoints: [
      'Deca 和 Dbol 都會芳香化 → 幾乎一定需要 AI',
      '必須備有 Cabergoline（Deca 為 19-nor）',
      'Dbol 期間必須護肝（TUDCA + NAC）',
      '雌激素管理是此組合的最大挑戰',
    ],
  },
  {
    name: 'Test + Tren + Masteron（減脂三合一）',
    goal: '最大化減脂和肌肉硬度',
    compounds: [
      { name: 'Testosterone', dosageRange: '100-200 mg/週（低劑量）', notes: '許多使用者在減脂期偏好低 Test 以減少水腫和雌激素問題' },
      { name: 'Trenbolone Acetate', dosageRange: '200-400 mg/週', notes: '主要合成代謝來源；200-300mg 對多數人已足夠' },
      { name: 'Masteron Propionate', dosageRange: '300-500 mg/週', notes: '硬化/外觀效果 + 溫和抗雌特性' },
    ],
    keyPoints: [
      '通常全使用短酯（Test P + Tren A + Mast P）以便快速調整',
      'Masteron 的抗雌效果可能減少 AI 需求',
      '必須備有 Cabergoline（Tren 為 19-nor）',
      '低 Test + Tren 方案在減脂期廣受歡迎，但部分使用者反映情緒/性慾較差',
    ],
  },
]

export const multiCompoundPrinciples = [
  '使用 3+ 化合物時，個別劑量應比單獨成對使用時更低 — 副作用是疊加甚至協同的',
  '總 mg 負載不是唯一指標；不同化合物的毒性類型也會疊加（肝毒性、心血管、腎臟）',
  '首次使用某化合物時不應同時堆疊多種新藥 — 無法判斷哪個造成副作用',
]

export const testTrenRatioDebate = {
  title: 'Test 與 Tren 劑量比例爭議',
  description: '社群中最常見的辯論之一。沒有統一正確答案 — 取決於個人反應。',
  highTest: {
    label: 'Test 高於 Tren（如 500 Test / 300 Tren）',
    pros: ['睪酮覆蓋正常生理功能（性慾、情緒、認知）', '較可預測的荷爾蒙環境'],
    cons: ['更多雌激素需要管理', '可能更多水腫'],
  },
  lowTest: {
    label: 'Test 低於 Tren（如 150-200 Test / 400 Tren）',
    pros: ['減少雌激素變數，更容易管理 Tren 特定副作用', '減脂期水腫更少'],
    cons: ['部分使用者反映情緒低落、性慾降低', '低 E2 風險'],
  },
  recommendation: '首次使用 Tren 應以中等 Test（300-500mg）+ 低 Tren（150-200mg）開始，評估個人反應後再調整比例。重點是 Tren 劑量盡可能保持在有效最低範圍（200-350mg/週）。',
}

export const testBaseRule = {
  title: '睪酮基底規則',
  description: '任何週期都應包含睪酮作為基底',
  reason: '合成代謝類固醇會抑制天然睪酮分泌。沒有 Test 基底會導致：性慾低下、勃起障礙、嗜睡、抑鬱、關節問題。',
  exception: '極短期純口服週期（有爭議；多數仍建議 Test 基底）',
}

export const cycleSupplements: CycleSupplement[] = [
  // 肝臟保護
  { category: '肝臟保護', name: 'TUDCA（牛磺熊去氧膽酸）', dosage: '500-1000 mg/天', purpose: '黃金標準護肝劑；降低肝酶；支持膽汁流動', when: '口服週期必備' },
  { category: '肝臟保護', name: 'NAC（N-乙醯半胱氨酸）', dosage: '600-1200 mg/天', purpose: '穀胱甘肽前體（主要抗氧化劑）；中和 C17-aa 代謝產生的自由基', when: '所有週期' },
  { category: '肝臟保護', name: 'Milk Thistle（水飛薊素）', dosage: '250-500 mg/天', purpose: '溫和護肝；效力不如 TUDCA/NAC 但廣泛可得', when: '口服週期輔助' },
  // 心血管
  { category: '心血管', name: '魚油（Omega-3）', dosage: '2-4 g/天', purpose: '支持健康脂質；抗炎', when: '所有週期' },
  { category: '心血管', name: 'CoQ10（輔酶 Q10）', dosage: '100-200 mg/天', purpose: '心肌支持；抗氧化', when: '所有週期' },
  { category: '心血管', name: '山楂漿果萃取物', dosage: '500-1000 mg/天', purpose: '擴張血管；降血壓；強化心臟', when: '所有週期' },
  { category: '心血管', name: '香柑橘（Citrus Bergamot）', dosage: '500-1000 mg/天', purpose: '支持健康膽固醇水平', when: '所有週期' },
  // 血壓
  { category: '血壓管理', name: 'Nebivolol（處方藥）', dosage: '2.5-5 mg/天', purpose: 'β-阻斷劑；AAS 使用者常用', when: '血壓偏高時' },
  { category: '血壓管理', name: 'Telmisartan（處方藥）', dosage: '20-40 mg/天', purpose: 'ARB；具心臟保護特性', when: '血壓偏高時' },
  { category: '血壓管理', name: '大蒜萃取物（Kyolic）', dosage: '600-1200 mg/天', purpose: '溫和降血壓', when: '所有週期' },
  // 腎臟
  { category: '腎臟保護', name: '黃芪（Astragalus）', dosage: '500-1000 mg/天', purpose: '腎臟保護特性', when: '所有週期' },
  { category: '腎臟保護', name: '充足飲水', dosage: '3-4+ 公升/天', purpose: '預防脫水引起的腎臟壓力', when: '所有週期' },
  // 通用
  { category: '通用健康', name: '綜合維他命', dosage: '每天 1 粒', purpose: '填補微量營養素缺口', when: '所有週期' },
  { category: '通用健康', name: 'Vitamin D3', dosage: '2000-5000 IU/天', purpose: '常缺乏；支持免疫功能', when: '所有週期' },
  { category: '通用健康', name: '鎂（Magnesium）', dosage: '400-500 mg/天', purpose: '肌肉恢復、睡眠、心血管', when: '所有週期' },
  { category: '通用健康', name: '鋅（Zinc）', dosage: '25-50 mg/天', purpose: '支持睪酮生產、免疫', when: '所有週期' },
]

export const minimumCycleSupport = [
  { name: 'NAC', dosage: '600 mg/天', note: '所有週期' },
  { name: '魚油', dosage: '2-4 g/天', note: '所有週期' },
  { name: 'TUDCA', dosage: '500 mg/天', note: '口服週期加入' },
  { name: '家用血壓計', dosage: '定期測量', note: '必備' },
  { name: '定期血液檢查', dosage: '週期前、中期、PCT 後', note: '必備' },
]
