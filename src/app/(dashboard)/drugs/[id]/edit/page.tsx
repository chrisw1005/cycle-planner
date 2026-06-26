'use client'

import { Suspense, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDrug, useUpdateDrug } from '@/hooks/use-drugs'
import { DrugForm } from '@/components/drugs/drug-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function EditDrugContent({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  // `from` lets callers (e.g. the cycle builder) send the user back where they
  // came from. Restrict to internal absolute paths to avoid open-redirect:
  // must start with a single "/" not followed by "/" or "\" (both normalize to
  // a cross-origin URL in the browser). Default to the drug inventory so
  // entering from there keeps its original behavior.
  const rawFrom = searchParams.get('from')
  const from = rawFrom && /^\/(?![/\\])/.test(rawFrom) ? rawFrom : '/drugs'
  const backLabel = from.startsWith('/cycles/') ? '返回課表' : '返回藥物庫存'

  const { data: drug, isLoading } = useDrug(id)
  const updateDrug = useUpdateDrug()

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">載入中…</div>
  }

  if (!drug) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">找不到藥品</div>
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Button variant="ghost" size="sm" render={<Link href={from} />}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        {backLabel}
      </Button>
      <DrugForm
        initialData={drug}
        onSubmit={(data) => {
          updateDrug.mutate(
            { id, ...data },
            { onSuccess: () => router.push(from) }
          )
        }}
        loading={updateDrug.isPending}
      />
    </div>
  )
}

export default function EditDrugPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12 text-muted-foreground">載入中…</div>}>
      <EditDrugContent id={id} />
    </Suspense>
  )
}
