"use client"

import { useRef, useCallback, useEffect } from "react"

interface UseInfiniteScrollOptions {
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  threshold?: number
  rootMargin?: string
  dependencies?: unknown[]
}

export function useInfiniteScroll({
  loading,
  hasMore,
  onLoadMore,
  threshold = 0.1,
  rootMargin = "0px 0px 200px 0px",
  dependencies = [],
}: UseInfiniteScrollOptions) {
  const observer = useRef<IntersectionObserver | null>(null)

  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {

      if (loading) {
        return
      }

      if (observer.current) {
        observer.current.disconnect()
      }

      observer.current = new IntersectionObserver(
        (entries) => {

          if (entries[0].isIntersecting && hasMore && !loading) {
            onLoadMore()
          }
        },
        { threshold, rootMargin },
      )

      if (node) {
        observer.current.observe(node)
      }
    },
    [loading, hasMore, onLoadMore, threshold, rootMargin, ...dependencies],
  )

  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect()
      }
    }
  }, [])

  return sentinelRef
}
