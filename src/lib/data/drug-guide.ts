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
}

export interface PCTTimingEntry {
  compound: string
  waitTime: string
}

export interface PCTProtocol {
  name: string
  suitability: string
  drugs: { name: string; dosage: string; duration: string }[]
  notes: string[]
}

export interface AIComparisonEntry {
  name: string
  type: string
  typicalDose: string
  frequency: string
  e2Suppression: string
  lipidImpact: string
  notes: string
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
}

export interface CycleSupplement {
  category: string
  name: string
  dosage: string
  purpose: string
  when: string
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
    pct: '最後一針 2 週後開始：Nolvadex 20mg/天 x 4 週（第 3-4 週可降至 10mg），或 Clomid 50mg/天 x 2 週 → 25mg/天 x 2 週',
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
    pct: '最後一針 Deca 後 3 週開始（Deca 清除時間較長）',
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
  { compound: 'Primobolan', category: '注射型', beginner: '300-400', intermediate: '400-600', advanced: '600-800', unit: 'mg/週', notes: '溫和，副作用少' },
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
    name: 'Nolvadex 單獨方案',
    suitability: '輕度至中度週期',
    drugs: [
      { name: 'Nolvadex (Tamoxifen)', dosage: '20 mg/天', duration: '第 1-2 週' },
      { name: 'Nolvadex (Tamoxifen)', dosage: '10 mg/天', duration: '第 3-4 週' },
    ],
    notes: ['Nolvadex 副作用較 Clomid 少', '最常用的 PCT 方案'],
  },
  {
    name: 'Clomid 單獨方案',
    suitability: '輕度至中度週期',
    drugs: [
      { name: 'Clomid (Clomiphene)', dosage: '50 mg/天', duration: '第 1-2 週' },
      { name: 'Clomid (Clomiphene)', dosage: '25 mg/天', duration: '第 3-4 週' },
    ],
    notes: ['可能導致視覺問題和情緒波動', '效果與 Nolvadex 相當'],
  },
  {
    name: 'Nolvadex + Clomid 聯合方案',
    suitability: '中度至重度週期',
    drugs: [
      { name: 'Nolvadex', dosage: '20 mg/天', duration: '共 4 週' },
      { name: 'Clomid', dosage: '50 mg/天 → 25 mg/天', duration: '前 2 週 50mg → 後 2 週 25mg' },
    ],
    notes: ['適合較重的週期', '兩者作用機制互補'],
  },
  {
    name: 'Dr. Scally Power PCT（黃金標準）',
    suitability: '重度/長期週期',
    drugs: [
      { name: 'HCG', dosage: '2000 IU EOD', duration: '共 20 天（10 劑）' },
      { name: 'Clomid', dosage: '100 mg/天（50mg 早 + 50mg 晚）', duration: '共 30 天' },
      { name: 'Nolvadex', dosage: '20 mg/天', duration: '共 45 天' },
    ],
    notes: [
      '三者同時使用，HCG 階段為前 20 天，SERM 持續至完成',
      'Dr. Scally 臨床研究：19 名男性中 100% 在 45 天內恢復睪酮',
      '適合長期或高劑量週期',
    ],
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
    '不要在 PCT 期間使用 HCG（會透過負反饋抑制 LH）',
    '單次劑量勿超過 1000 IU（Leydig 細胞脫敏風險）',
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
  },
  {
    name: 'Exemestane (Aromasin)',
    type: '自殺性（不可逆）',
    typicalDose: '12.5 mg',
    frequency: 'EOD',
    e2Suppression: '劑量依賴型',
    lipidImpact: '中性/輕微正面',
    notes: '首選 — 無反彈；輕微雄激素性',
  },
  {
    name: 'Letrozole (Femara)',
    type: '可逆性，非類固醇型',
    typicalDose: '0.5-1.0 mg',
    frequency: 'EOD',
    e2Suppression: '極強（>95%）',
    lipidImpact: '負面',
    notes: '僅限緊急使用（活性女乳症）；日常使用太強',
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
  { severity: 'danger', combo: '多種 C17-aa 口服同時使用', reason: '肝毒性疊加（如 Dbol + Anadrol、Winstrol + Superdrol）極度危險' },
  { severity: 'danger', combo: 'Trenbolone + Halotestin', reason: '兩者皆為極端化合物，心血管和肝臟壓力嚴重' },
  { severity: 'danger', combo: '多種 19-nor 化合物同時使用', reason: 'Tren + Deca：極度抑制、泌乳素問題疊加、恢復困難' },
  { severity: 'danger', combo: '長期 Letrozole + 高強度訓練', reason: 'E2 崩潰導致關節受傷風險' },
  // 謹慎
  { severity: 'caution', combo: '口服超過 6 週', reason: '肝毒性風險顯著增加' },
  { severity: 'caution', combo: 'Superdrol（任何劑量）', reason: '最強肝毒性口服之一' },
  { severity: 'caution', combo: 'Winstrol + 關節密集訓練', reason: 'Winstrol 使關節乾燥，增加受傷風險' },
  { severity: 'caution', combo: 'Clenbuterol + 興奮劑', reason: '心律不整風險（麻黃鹼、DMAA）' },
  { severity: 'caution', combo: 'T3 高劑量 >75mcg 長期', reason: '可導致肌肉流失和甲狀腺損傷' },
  { severity: 'caution', combo: 'Trenbolone + 有氧運動', reason: 'Tren 嚴重影響心肺功能' },
  // 安全搭配
  { severity: 'safe', combo: 'Test + Deca', reason: '經典增肌：Test 基底覆蓋 Deca 可能抑制的性慾/情緒' },
  { severity: 'safe', combo: 'Test + EQ', reason: '精瘦增肌：EQ 有溫和 AI 效果' },
  { severity: 'safe', combo: 'Test + Primobolan', reason: '高品質精瘦增重，副作用溫和' },
  { severity: 'safe', combo: 'Test + Masteron', reason: '減脂切割：Mast 有抗雌激素特性' },
  { severity: 'safe', combo: 'Test + Anavar', reason: '溫和搭配，適合進階初級者' },
  { severity: 'safe', combo: 'Test + Tren + Masteron', reason: '進階減脂三合一（需經驗豐富）' },
  { severity: 'safe', combo: '任何注射 + 短期口服 kickstart', reason: '口服 4-6 週等待注射劑生效' },
]

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
