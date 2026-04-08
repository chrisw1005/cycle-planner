'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CycleExamplesTab } from './tabs/cycle-examples-tab'
import { DosageGuideTab } from './tabs/dosage-guide-tab'
import { PCTProtocolsTab } from './tabs/pct-protocols-tab'
import { EstrogenManagementTab } from './tabs/estrogen-management-tab'
import { ProlactinManagementTab } from './tabs/prolactin-management-tab'
import { DrugStackingTab } from './tabs/drug-stacking-tab'
import { CycleSupportTab } from './tabs/cycle-support-tab'
import { HalfLivesTab } from './tabs/half-lives-tab'

interface DrugGuideModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const tabs = [
  { value: 'cycle-examples', label: '週期範例' },
  { value: 'dosage-guide', label: '劑量指南' },
  { value: 'pct-protocols', label: 'PCT 療程' },
  { value: 'estrogen-mgmt', label: '雌激素管理' },
  { value: 'prolactin-mgmt', label: '泌乳素管理' },
  { value: 'drug-stacking', label: '藥物搭配' },
  { value: 'cycle-support', label: '週期輔助' },
  { value: 'half-lives', label: '半衰期' },
] as const

export function DrugGuideModal({ open, onOpenChange }: DrugGuideModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>藥物指南</DialogTitle>
          <DialogDescription>
            基於醫學文獻與 harm reduction 社群的參考資料，供排制週期時查閱。
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="cycle-examples" className="flex-1 min-h-0">
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList variant="line" className="w-full justify-start">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="cycle-examples">
            <CycleExamplesTab />
          </TabsContent>
          <TabsContent value="dosage-guide">
            <DosageGuideTab />
          </TabsContent>
          <TabsContent value="pct-protocols">
            <PCTProtocolsTab />
          </TabsContent>
          <TabsContent value="estrogen-mgmt">
            <EstrogenManagementTab />
          </TabsContent>
          <TabsContent value="prolactin-mgmt">
            <ProlactinManagementTab />
          </TabsContent>
          <TabsContent value="drug-stacking">
            <DrugStackingTab />
          </TabsContent>
          <TabsContent value="cycle-support">
            <CycleSupportTab />
          </TabsContent>
          <TabsContent value="half-lives">
            <HalfLivesTab />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
