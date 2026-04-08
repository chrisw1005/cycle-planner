'use client'

import { useState, useRef } from 'react'
import { useDrugTemplates, useBrandSuggestions } from '@/hooks/use-drugs'
import { deleteDrugImage } from '@/lib/supabase/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DrugImageUpload } from './drug-image-upload'
import type { Drug, DrugTemplate, PrimaryCategory, SubCategory, EsterType } from '@/types'

interface DrugFormProps {
  initialData?: Drug
  onSubmit: (data: {
    template_id: string | null
    name: string
    concentration: number
    primary_category: PrimaryCategory
    sub_category: SubCategory | null
    ester_type: EsterType | null
    brand: string | null
    inventory_count: number
    tabs_per_box: number | null
    image_url: string | null
  }) => void
  loading?: boolean
}

const primaryCategories: PrimaryCategory[] = ['Injectable', 'Oral', 'PCT']
const subCategories: SubCategory[] = ['Test', 'Nor-19', 'DHT', 'AI', 'SERM', 'Prolactin', 'Other']
const esterTypes: EsterType[] = ['Long', 'Short', 'E3D']

export function DrugForm({ initialData, onSubmit, loading }: DrugFormProps) {
  const { data: templates } = useDrugTemplates()
  const { data: existingBrands } = useBrandSuggestions()
  const [selectedTemplate, setSelectedTemplate] = useState<DrugTemplate | null>(null)
  const [name, setName] = useState(initialData?.name || '')
  const [brand, setBrand] = useState(initialData?.brand || '')
  const [concentration, setConcentration] = useState(initialData?.concentration?.toString() || '')
  const [primaryCategory, setPrimaryCategory] = useState<PrimaryCategory>(initialData?.primary_category || 'Injectable')
  const [subCategory, setSubCategory] = useState<SubCategory | null>(initialData?.sub_category || null)
  const [esterType, setEsterType] = useState<EsterType | null>(initialData?.ester_type || null)
  const [imageUrl, setImageUrl] = useState<string | null>(initialData?.image_url || null)
  const [inventoryCount, setInventoryCount] = useState(initialData?.inventory_count?.toString() || '0')
  const [tabsPerBox, setTabsPerBox] = useState(initialData?.tabs_per_box?.toString() || '100')
  const [inventoryBoxes, setInventoryBoxes] = useState(() => {
    if (initialData && (initialData.primary_category === 'Oral' || initialData.primary_category === 'PCT') && initialData.tabs_per_box) {
      return Math.floor(initialData.inventory_count / initialData.tabs_per_box).toString()
    }
    return '0'
  })
  const [inventoryLoose, setInventoryLoose] = useState(() => {
    if (initialData && (initialData.primary_category === 'Oral' || initialData.primary_category === 'PCT') && initialData.tabs_per_box) {
      return (initialData.inventory_count % initialData.tabs_per_box).toString()
    }
    return '0'
  })
  const [mode, setMode] = useState<'template' | 'custom'>(initialData ? 'custom' : 'template')
  const pendingDeleteUrls = useRef<string[]>([])

  const handleTemplateSelect = (templateId: string) => {
    const template = templates?.find((t) => t.id === templateId)
    if (!template) return
    setSelectedTemplate(template)
    setName(`${template.short_name} ${template.default_concentration || ''}`.trim())
    setConcentration(template.default_concentration?.toString() || '')
    setPrimaryCategory(template.primary_category)
    setSubCategory(template.sub_category)
    setEsterType(template.ester_type)
  }

  const handlePendingDelete = (url: string) => {
    if (!pendingDeleteUrls.current.includes(url)) {
      pendingDeleteUrls.current.push(url)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Delete pending images before submitting
    for (const url of pendingDeleteUrls.current) {
      try { await deleteDrugImage(url) } catch { /* ignore */ }
    }
    pendingDeleteUrls.current = []
    onSubmit({
      template_id: selectedTemplate?.id || initialData?.template_id || null,
      name,
      concentration: parseFloat(concentration),
      primary_category: primaryCategory,
      sub_category: subCategory,
      ester_type: esterType,
      brand: brand.trim() || null,
      inventory_count: (primaryCategory === 'Oral' || primaryCategory === 'PCT')
        ? (parseInt(inventoryBoxes) || 0) * (parseInt(tabsPerBox) || 100) + (parseInt(inventoryLoose) || 0)
        : parseInt(inventoryCount) || 0,
      tabs_per_box: (primaryCategory === 'Oral' || primaryCategory === 'PCT') ? (parseInt(tabsPerBox) || null) : null,
      image_url: imageUrl,
    })
  }

  // Group templates by category
  const groupedTemplates = templates?.reduce((acc, t) => {
    const key = `${t.primary_category} - ${t.sub_category || 'Other'}`
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {} as Record<string, DrugTemplate[]>)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? '編輯藥品' : '新增藥品'}</CardTitle>
        {!initialData && (
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant={mode === 'template' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('template')}
            >
              從模板選擇
            </Button>
            <Button
              type="button"
              variant={mode === 'custom' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('custom')}
            >
              自訂藥品
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
            {/* Left column: image (desktop) */}
            <div className="hidden lg:flex lg:items-center lg:justify-center">
              <DrugImageUpload currentUrl={imageUrl} onUrlChange={setImageUrl} onPendingDelete={handlePendingDelete} />
            </div>

            {/* Right column: all fields */}
            <div className="space-y-4">
              {/* Template selector */}
              {mode === 'template' && !initialData && (
                <div className="space-y-2">
                  <Label>選擇藥物模板</Label>
                  <Select onValueChange={(v: string | null) => v && handleTemplateSelect(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="選擇藥物…">
                        {(value: string | null) => {
                          if (!value) return '選擇藥物…'
                          const t = templates?.find(tmpl => tmpl.id === value)
                          return t ? `${t.short_name} — ${t.generic_name}${t.default_concentration ? ` (${t.default_concentration}${t.default_unit})` : ''}` : String(value)
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {groupedTemplates && Object.entries(groupedTemplates).map(([group, items]) => (
                        <SelectGroup key={group}>
                          <SelectLabel>{group}</SelectLabel>
                          {items.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.short_name} — {t.generic_name}
                              {t.default_concentration ? ` (${t.default_concentration}${t.default_unit})` : ''}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">藥品名稱 *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. TestE 300"
                  required
                />
              </div>

              {/* Brand */}
              <div className="space-y-2">
                <Label htmlFor="brand">廠牌</Label>
                <Input
                  id="brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Alpha Pharma"
                  list="brand-suggestions"
                />
                <datalist id="brand-suggestions">
                  {[...new Set([
                    ...(existingBrands || []),
                    ...(selectedTemplate?.brand_names || []),
                  ])].map(b => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground">
                  選填，建議從清單中選擇以保持名稱一致性
                </p>
              </div>

              {/* Concentration */}
              <div className="space-y-2">
                <Label htmlFor="concentration">濃度/劑量 *</Label>
                <Input
                  id="concentration"
                  type="number"
                  step="any"
                  value={concentration}
                  onChange={(e) => setConcentration(e.target.value)}
                  placeholder="e.g. 300"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  注射劑: mg/ml | 口服: mg/tab | 其他: mcg/tab 或 IU/vial
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Primary Category */}
                <div className="space-y-2">
                  <Label>主要分類 *</Label>
                  <Select value={primaryCategory} onValueChange={(v: string | null) => v && setPrimaryCategory(v as PrimaryCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {primaryCategories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sub Category */}
                <div className="space-y-2">
                  <Label>次分類</Label>
                  <Select value={subCategory || 'none'} onValueChange={(v: string | null) => v && setSubCategory(v === 'none' ? null : v as SubCategory)}>
                    <SelectTrigger>
                      <SelectValue placeholder="選填" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">無</SelectItem>
                      {subCategories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Ester Type (Injectable only) */}
              {primaryCategory === 'Injectable' && (
                <div className="space-y-2">
                  <Label>酯類（注射頻率）</Label>
                  <Select value={esterType || 'none'} onValueChange={(v: string | null) => v && setEsterType(v === 'none' ? null : v as EsterType)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">無</SelectItem>
                      <SelectItem value="Long">Long（長效 — 每週 2 次）</SelectItem>
                      <SelectItem value="Short">Short（短效 — 每隔一天）</SelectItem>
                      <SelectItem value="E3D">E3D（每三天 — HCG）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Drug Image (mobile) */}
              <div className="lg:hidden">
                <DrugImageUpload currentUrl={imageUrl} onUrlChange={setImageUrl} onPendingDelete={handlePendingDelete} />
              </div>

              {/* Tabs per box (oral only) */}
              {(primaryCategory === 'Oral' || primaryCategory === 'PCT') && (
                <div className="space-y-2">
                  <Label htmlFor="tabsPerBox">每盒顆數</Label>
                  <Input
                    id="tabsPerBox"
                    type="number"
                    min="1"
                    value={tabsPerBox}
                    onChange={(e) => setTabsPerBox(e.target.value)}
                  />
                </div>
              )}

              {/* Inventory */}
              {(primaryCategory === 'Oral' || primaryCategory === 'PCT') ? (
                <div className="space-y-2">
                  <Label>庫存數量</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Input
                        type="number"
                        min="0"
                        value={inventoryBoxes}
                        onChange={(e) => setInventoryBoxes(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">盒</p>
                    </div>
                    <div>
                      <Input
                        type="number"
                        min="0"
                        value={inventoryLoose}
                        onChange={(e) => setInventoryLoose(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">顆（散裝）</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    共 {(parseInt(inventoryBoxes) || 0) * (parseInt(tabsPerBox) || 100) + (parseInt(inventoryLoose) || 0)} 顆
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="inventory">庫存數量</Label>
                  <Input
                    id="inventory"
                    type="number"
                    min="0"
                    value={inventoryCount}
                    onChange={(e) => setInventoryCount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">瓶數（每瓶 10ml）</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '儲存中…' : initialData ? '更新藥品' : '新增藥品'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
