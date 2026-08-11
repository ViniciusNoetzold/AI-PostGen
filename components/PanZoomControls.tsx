'use client'

import { Minus, Plus, RotateCcw } from 'lucide-react'

type PanZoomControlsProps = {
  scale: number
  minScale: number
  maxScale: number
  canReset: boolean
  onZoomOut: () => void
  onZoomIn: () => void
  onReset: () => void
  className?: string
}

export function PanZoomControls({ scale, minScale, maxScale, canReset, onZoomOut, onZoomIn, onReset, className = '' }: PanZoomControlsProps) {
  return (
    <div data-pan-zoom-controls className={`absolute right-4 top-4 z-30 flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-950/85 p-1.5 text-slate-200 shadow-xl backdrop-blur ${className}`}>
      <button type="button" onClick={onZoomOut} disabled={scale <= minScale} className="grid size-8 place-items-center rounded-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Distanciar visualização" title="Distanciar"><Minus className="size-4" /></button>
      <span className="min-w-12 text-center text-[11px] font-semibold tabular-nums">{Math.round(scale * 100)}%</span>
      <button type="button" onClick={onZoomIn} disabled={scale >= maxScale} className="grid size-8 place-items-center rounded-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Aproximar visualização" title="Aproximar"><Plus className="size-4" /></button>
      <button type="button" onClick={onReset} disabled={!canReset} className="ml-1 grid size-8 place-items-center rounded-lg border-l border-slate-700 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Redefinir posição e zoom" title="Redefinir"><RotateCcw className="size-4" /></button>
    </div>
  )
}
