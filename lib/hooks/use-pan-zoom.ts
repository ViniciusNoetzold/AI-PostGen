'use client'

import { useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'

export type PanZoomViewport = { scale: number; x: number; y: number }

type PanGesture = {
  pointerId: number
  startClientX: number
  startClientY: number
  startViewportX: number
  startViewportY: number
  moved: boolean
}

type PanZoomOptions = {
  minScale?: number
  maxScale?: number
  wheelSensitivity?: number
}

export function usePanZoom<T extends HTMLElement = HTMLDivElement>({
  minScale = 0.6,
  maxScale = 2.5,
  wheelSensitivity = 0.0015,
}: PanZoomOptions = {}) {
  const containerRef = useRef<T>(null)
  const gestureRef = useRef<PanGesture | null>(null)
  const suppressClickRef = useRef(false)
  const [viewport, setViewport] = useState<PanZoomViewport>({ scale: 1, x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)

  function updateZoom(resolveScale: (currentScale: number) => number, focalPoint?: { x: number; y: number }) {
    setViewport((current) => {
      const scale = Math.min(maxScale, Math.max(minScale, resolveScale(current.scale)))
      if (scale === current.scale) return current

      const bounds = containerRef.current?.getBoundingClientRect()
      const focal = focalPoint || {
        x: (bounds?.width || 0) / 2,
        y: (bounds?.height || 0) / 2,
      }
      const ratio = scale / current.scale

      return {
        scale,
        x: focal.x - (focal.x - current.x) * ratio,
        y: focal.y - (focal.y - current.y) * ratio,
      }
    })
  }

  function zoomBy(delta: number) {
    updateZoom((scale) => scale + delta)
  }

  function reset() {
    gestureRef.current = null
    suppressClickRef.current = false
    setIsPanning(false)
    setViewport({ scale: 1, x: 0, y: 0 })
  }

  function onWheel(event: ReactWheelEvent<T>) {
    event.preventDefault()
    const bounds = event.currentTarget.getBoundingClientRect()
    const zoomFactor = Math.exp(-event.deltaY * wheelSensitivity)
    updateZoom((scale) => scale * zoomFactor, {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    })
  }

  function onPointerDownCapture(event: ReactPointerEvent<T>) {
    if (!event.shiftKey || event.button !== 0) return

    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    gestureRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startViewportX: viewport.x,
      startViewportY: viewport.y,
      moved: false,
    }
    suppressClickRef.current = false
    setIsPanning(true)
  }

  function onPointerMove(event: ReactPointerEvent<T>) {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return

    event.preventDefault()
    const deltaX = event.clientX - gesture.startClientX
    const deltaY = event.clientY - gesture.startClientY
    if (Math.abs(deltaX) + Math.abs(deltaY) > 3) gesture.moved = true
    setViewport((current) => ({
      ...current,
      x: gesture.startViewportX + deltaX,
      y: gesture.startViewportY + deltaY,
    }))
  }

  function finishPan(event: ReactPointerEvent<T>) {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return

    suppressClickRef.current = gesture.moved
    if (gesture.moved) {
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
    }
    gestureRef.current = null
    setIsPanning(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function onClickCapture(event: ReactMouseEvent<T>) {
    if (!suppressClickRef.current) return
    suppressClickRef.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return {
    containerRef,
    viewport,
    isPanning,
    minScale,
    maxScale,
    canReset: viewport.scale !== 1 || viewport.x !== 0 || viewport.y !== 0,
    zoomBy,
    reset,
    handlers: {
      onWheel,
      onPointerDownCapture,
      onPointerMove,
      onPointerUp: finishPan,
      onPointerCancel: finishPan,
      onLostPointerCapture: finishPan,
      onClickCapture,
    },
  }
}
