"use client"

import Link from "next/link"
import { Card, Icon, primaryButton, secondaryButton } from "@/components/ui"

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <Card className="mx-auto max-w-xl p-8 text-center">
      <span className="mx-auto mb-5 flex w-fit rounded-2xl bg-amber-50 p-4 text-amber-700">
        <Icon name="alert" className="h-7 w-7" />
      </span>
      <h1 className="text-xl font-semibold">We couldn’t load this page</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        Try again. If this continues, check that you have an active organization
        and the required access, or contact your administrator.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button className={primaryButton} onClick={reset}>
          Try again
        </button>
        <Link href="/dashboard" className={secondaryButton}>
          Back to overview
        </Link>
      </div>
    </Card>
  )
}
