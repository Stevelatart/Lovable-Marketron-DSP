'use client'
import { useState } from 'react'

export function EmailKeywordForm({
  advertiserId,
  initial,
  dspAccountId,
}: {
  advertiserId: string
  initial: string
  dspAccountId: string
}) {
  const [keyword, setKeyword] = useState(initial)
  const [dspId, setDspId] = useState(dspAccountId)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function save() {
    setStatus('saving')
    const res = await fetch(`/api/advertisers/${advertiserId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailKeyword: keyword, dspAccountId: dspId }),
    })
    setStatus(res.ok ? 'saved' : 'error')
    if (res.ok) setTimeout(() => setStatus('idle'), 2000)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Subject Keyword</label>
        <input
          type="text"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          placeholder="e.g. Acme Corp"
        />
        <p className="text-xs text-slate-400 mt-1">Matched against the subject of incoming Amazon DSP report emails</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">DSP Account ID (optional)</label>
        <input
          type="text"
          value={dspId}
          onChange={e => setDspId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          placeholder="e.g. 1234567890"
        />
        <p className="text-xs text-slate-400 mt-1">Used as a secondary match if the keyword doesn&apos;t uniquely identify the email</p>
      </div>
      <button
        onClick={save}
        disabled={status === 'saving'}
        className="btn-primary disabled:opacity-60"
      >
        {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved!' : 'Save'}
      </button>
      {status === 'error' && <p className="text-sm text-red-600">Save failed. Try again.</p>}
    </div>
  )
}
