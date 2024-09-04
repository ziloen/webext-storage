import { useCallback, useRef, useState } from 'react'

/**
 * @example
 * ```ts
 * const [state, setState, getState] = useGetState(0)
 *
 * function handleChange() {
 *   getState()
 *   // 0
 *   setState(getState() + 1)
 *   setState(getState() + 1)
 *   getState()
 *   // 2
 * }
 * ```
 */
export function useGetState<T>(value: T | (() => T)) {
  const [state, originalSetState] = useState(value)
  const ref = useRef(state)

  const getState = useCallback(() => ref.current, [])

  const setState = useCallback((value: T) => {
    originalSetState((ref.current = value))
  }, [])

  return [state, setState, getState] as const
}
