"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface HorizontalScrollProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  enableDragScroll?: boolean
}

function isInteractiveTarget(el: EventTarget | null) {
  if (!el) return false
  // `event.target` pode ser SVGElement (não é HTMLElement). Usamos `closest` via Element.
  const node = el as Element
  const closest = (node as unknown as { closest?: (sel: string) => Element | null }).closest
  if (!closest) return false
  return Boolean(
    closest.call(
      node,
      'a,button,input,textarea,select,option,[role="button"],[role="link"],[contenteditable="true"],[data-no-drag-scroll="true"]',
    ),
  )
}

function setRef<T>(ref: React.Ref<T> | undefined, value: T) {
  if (!ref) return
  if (typeof ref === "function") ref(value)
  else (ref as React.MutableRefObject<T>).current = value
}

export const HorizontalScroll = React.forwardRef<HTMLDivElement, HorizontalScrollProps>(
  function HorizontalScroll(
    { className, children, enableDragScroll = true, style, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture, ...props },
    forwardedRef,
  ) {
    const ref = React.useRef<HTMLDivElement | null>(null)
  const pointerIdRef = React.useRef<number | null>(null)
  const startXRef = React.useRef(0)
  const startScrollLeftRef = React.useRef(0)
  const movedRef = React.useRef(false)
  const lastDragAtRef = React.useRef<number>(0)

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enableDragScroll) return
      if (e.button !== 0) return // only primary click/touch
      if (e.pointerType === "mouse" && (e.ctrlKey || e.metaKey || e.shiftKey)) return
      if (isInteractiveTarget(e.target)) return

      const el = ref.current
      if (!el) return

      pointerIdRef.current = e.pointerId
      startXRef.current = e.clientX
      startScrollLeftRef.current = el.scrollLeft
      movedRef.current = false

      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        // ignore
      }
    },
    [enableDragScroll],
  )

  const handlePointerMove = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    if (pointerIdRef.current === null || e.pointerId !== pointerIdRef.current) return

    const dx = e.clientX - startXRef.current
    if (!movedRef.current && Math.abs(dx) < 6) return
    movedRef.current = true

    // Dragging to the right should scroll left, and vice-versa.
    el.scrollLeft = startScrollLeftRef.current - dx
    e.preventDefault()
  }, [])

  const endDrag = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    if (pointerIdRef.current === null || e.pointerId !== pointerIdRef.current) return

    try {
      el.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    } finally {
      pointerIdRef.current = null
      if (movedRef.current) lastDragAtRef.current = Date.now()
    }
  }, [])

  const handleClickCapture = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Never swallow clicks on interactive elements (buttons, links, inputs, etc.)
    if (isInteractiveTarget(e.target)) {
      movedRef.current = false
      return
    }

    // If the user dragged, avoid "click-through" on cards/links.
    if (movedRef.current) {
      e.preventDefault()
      e.stopPropagation()
      movedRef.current = false
      return
    }
    // If we just finished a drag-scroll, ignore the immediate click only.
    const dt = Date.now() - lastDragAtRef.current
    if (dt >= 0 && dt < 280) {
      e.preventDefault()
      e.stopPropagation()
    }
  }, [])

  return (
    <div
      ref={(el) => {
        ref.current = el
        setRef(forwardedRef, el)
      }}
      className={cn(
        "relative h-full w-full overflow-x-auto overflow-y-hidden",
        enableDragScroll ? "cursor-grab active:cursor-grabbing" : null,
        className,
      )}
      style={{
        // Allow vertical scrolling inside columns; we handle horizontal dragging ourselves.
        touchAction: enableDragScroll ? "pan-y" : undefined,
        ...style,
      }}
      onPointerDown={(e) => {
        handlePointerDown(e)
        onPointerDown?.(e)
      }}
      onPointerMove={(e) => {
        handlePointerMove(e)
        onPointerMove?.(e)
      }}
      onPointerUp={(e) => {
        endDrag(e)
        onPointerUp?.(e)
      }}
      onPointerCancel={(e) => {
        endDrag(e)
        onPointerCancel?.(e)
      }}
      onClickCapture={(e) => {
        handleClickCapture(e)
        onClickCapture?.(e)
      }}
      {...props}
    >
      <div className="flex h-full min-h-full w-full">{children}</div>
    </div>
  )
  },
)

