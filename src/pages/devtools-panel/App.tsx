import { listenEvent } from '@ziloen/webext-utils'
import clsx from 'clsx'
import { noop } from 'lodash-es'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createContext, useContextSelector } from 'use-context-selector'
import { useGetState, useLatest, useMemoizedFn } from '~/hooks'
import { CodiconCollapseAll } from '~/icons'
import { evalFn, getProxyStorage } from '~/utils'

// Highlight search value
// Delete button

const HIGHLIGHT_TIMEOUT = 1_000

function useUnmountSignal() {
  const [ac] = useState(() => new AbortController())

  useEffect(() => () => ac.abort(), [])

  return ac.signal
}

export function App() {
  const [targetState, setTargetState, getTargetState] = useGetState<Record<
    string,
    unknown
  > | null>(null)
  const [highlightKeys, setHighlightKeys] = useState(
    new Map<
      string,
      [
        type: 'added' | 'modified' | 'deleted' | 'ignored',
        timer: ReturnType<typeof setTimeout>,
      ]
    >()
  )
  const latestHighlightKeys = useLatest(highlightKeys)

  const unmountSignal = useUnmountSignal()

  const [bytesInUse, setBytesInUse] = useState(0)

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = useMemoizedFn(async () => {
    const extensionId = await evalFn((chrome) => {
      const location = document.location
      if (
        !location ||
        location.protocol === 'chrome-extension:' ||
        location.protocol === 'moz-extension:'
      ) {
        return chrome.runtime.id
      }

      return
    })

    if (!extensionId) return
    const storage = await getProxyStorage(extensionId)

    storage.local
      .get(null)
      .then((state) => setTargetState(sortObject(state)))
      .catch(() => {})

    storage.local.getBytesInUse?.(null).then((bytes) => {
      setBytesInUse(bytes)
    })

    listenEvent(
      storage.local.onChanged,
      (changes) => {
        const nextState = { ...getTargetState() }

        for (const [key, change] of Object.entries(changes)) {
          if (Object.hasOwn(change, 'newValue')) {
            nextState[key] = change.newValue
            const hasOld = Object.hasOwn(change, 'oldValue')
            setHighlightKeys((pre) => {
              if (pre.has(key)) {
                clearTimeout(pre.get(key)![1])
              }
              const timeout = setTimeout(() => {
                hasOld &&
                  setHighlightKeys((pre) => {
                    const next = new Map(pre)
                    next.delete(key)
                    return next
                  })
              }, HIGHLIGHT_TIMEOUT)
              return new Map(pre).set(key, [
                hasOld ? 'modified' : 'added',
                timeout,
              ])
            })
          } else {
            // Deleted
            setHighlightKeys((pre) => {
              if (pre.has(key)) {
                clearTimeout(pre.get(key)![1])
              }

              const timeout = setTimeout(() => {
                setHighlightKeys((pre) => {
                  if (!pre.has(key)) return pre
                  const next = new Map(pre)
                  clearTimeout(pre.get(key)![1])
                  next.set(key, [
                    'ignored',
                    setTimeout(noop, HIGHLIGHT_TIMEOUT),
                  ])
                  return next
                })
              }, HIGHLIGHT_TIMEOUT)

              return new Map(pre).set(key, ['deleted', timeout])
            })
          }
        }

        setTargetState(sortObject(nextState))
      },
      { signal: unmountSignal }
    )
  })

  return (
    <CtxProvider modifiedKeys={highlightKeys}>
      <div className="bg-main-background text-foreground flex size-full flex-col font-sans text-[14px]">
        <div className="flex h-[40px] items-center gap-[12px] px-[8px]">
          <SearchInput />

          <SearchExclude />

          <div className="bg-button.background hover:bg-button.hover-background cursor-pointer px-2 py-1">
            storage.local
          </div>

          <span>{formatBytes(bytesInUse)}</span>

          <button
            className="flex-center not-disabled:hover:bg-toolbar.hover-background ms-auto box-content size-[16px] cursor-pointer rounded-[5px] p-[3px] disabled:cursor-default disabled:opacity-60"
            style={{
              backgroundSize: '16px',
              backgroundPosition: '50%',
            }}
          >
            <CodiconCollapseAll className="text-[16px]" />
          </button>
        </div>

        <div
          className={clsx(
            'min-h-0 flex-1 overflow-x-clip overflow-y-auto font-mono',
            'webkit-scrollbar:size-[10px] webkit-scrollbar-thumb:bg-scrollbar-slider.background hover:webkit-scrollbar-thumb:bg-scrollbar-slider.hover-background active:webkit-scrollbar-thumb:bg-scrollbar-slider.active-background webkit-scrollbar-button:hidden'
          )}
        >
          {targetState &&
            Object.entries(targetState).map(([key, value]) => (
              <KeyDisplay key={key} property={key} value={value} />
            ))}
        </div>
      </div>
    </CtxProvider>
  )
}

function formatBytes(bytes: number) {
  const base = 1024
  let n = 0
  const labels = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB']

  while (bytes > base && n < labels.length - 1) {
    bytes /= base
    n++
  }

  return `${bytes.toFixed(2)}${labels[n] ?? 'B'}`
}

function KeyDisplay({ property, value }: { property: string; value: unknown }) {
  const searchValue = useContextSelector(Ctx, (ctx) =>
    ctx.searchValue.toLowerCase()
  )

  const excludeArr = useContextSelector(Ctx, (ctx) => ctx.excludeArr)

  const status = useContextSelector(Ctx, (ctx) =>
    ctx.modifiedKeys.has(property) ? ctx.modifiedKeys.get(property)![0] : null
  )

  const excluded = useMemo(() => {
    return excludeArr.some((s) => property.toLowerCase().includes(s))
  }, [excludeArr, property])

  const stringifiedValueRef = useRef<string | null>(null)

  const stringfyValue = useMemoizedFn(() => {
    return (stringifiedValueRef.current = JSON.stringify(value))
  })

  const searchHidden = useMemo(() => {
    if (!searchValue) return false
    if (property.toLocaleLowerCase().includes(searchValue)) return false

    let stringifiedValue = stringifiedValueRef.current

    if (stringifiedValue === null) {
      stringifiedValue = stringfyValue()
    }

    if (stringifiedValue.toLocaleLowerCase().includes(searchValue)) {
      return false
    }

    return true
  }, [property, searchValue])

  if (searchHidden || excluded) {
    return null
  }

  return (
    <div
      className="group flex h-[22px] justify-between px-[12px] leading-[22px] duration-1000 data-status:duration-0 data-[status=modified]:bg-white/5"
      data-status={status}
      style={{
        transitionProperty:
          'color, background-color, border-color, text-decoration-color, fill, stroke',
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        className={clsx(
          'duration-1000',
          'group-data-[status=added]:text-added-foreground group-data-[status=added]:duration-0',
          'group-data-[status=deleted]:text-deleted-foreground group-data-[status=deleted]:duration-0',
          'group-data-[status=ignored]:text-ignored-foreground',
          'group-data-[status=modified]:text-modified-foreground group-data-[status=modified]:duration-0'
        )}
        style={{
          transitionProperty:
            'color, background-color, border-color, text-decoration-color, fill, stroke',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {property}
      </div>
      {/* <div>{value}</div> */}
    </div>
  )
}

const Ctx = createContext({
  expandedNodes: [] as string[][],
  selectedNodes: [] as string[][],
  searchValue: '',
  setSearchValue: (value: string) => {},
  modifiedKeys: new Map<
    string,
    [
      type: 'added' | 'modified' | 'deleted' | 'ignored',
      timer: ReturnType<typeof setTimeout>,
    ]
  >(),
  excludeValue: '',
  excludeArr: [] as string[],
  setExcludeValue: (value: string) => {},
})

function CtxProvider({
  children,
  modifiedKeys,
}: {
  children: React.ReactNode
  modifiedKeys: Map<
    string,
    [
      type: 'added' | 'modified' | 'deleted' | 'ignored',
      timer: ReturnType<typeof setTimeout>,
    ]
  >
}) {
  const [expandedNodes, setExpandedNodes] = useState<string[][]>([])
  const [selectedNodes, setSelectedNodes] = useState<string[][]>([])
  const [searchValue, setSearchValue] = useState('')
  const [excludeValue, setExcludeValue] = useState('')

  const excludeArr = useMemo(() => {
    return excludeValue
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  }, [excludeValue])

  return (
    <Ctx.Provider
      value={{
        expandedNodes,
        selectedNodes,
        searchValue,
        modifiedKeys,
        setSearchValue,
        excludeValue,
        excludeArr,
        setExcludeValue,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

function SearchInput() {
  const searchValue = useContextSelector(Ctx, (ctx) => ctx.searchValue)
  const setSearchValue = useContextSelector(Ctx, (ctx) => ctx.setSearchValue)

  return (
    <label className="flex items-center gap-[8px]">
      <div>Search:</div>

      <input
        className="h-[24px] bg-[#1d1f23] py-[3px] ps-[6px] leading-[1.4em] text-[#abb2bf] placeholder:text-[#cccccc80] focus-visible:outline-[#3e4452] focus-visible:outline-solid"
        type="text"
        placeholder="key & value"
        value={searchValue}
        onChange={(e) => setSearchValue(e.currentTarget.value)}
      />
    </label>
  )
}

function SearchExclude() {
  const excludeValue = useContextSelector(Ctx, (ctx) => ctx.excludeValue)
  const setExcludeValue = useContextSelector(Ctx, (ctx) => ctx.setExcludeValue)

  return (
    <label className="flex items-center gap-[8px]">
      <div>Exclude keys:</div>

      <input
        className="h-[24px] bg-[#1d1f23] py-[3px] ps-[6px] leading-[1.4em] text-[#abb2bf] placeholder:text-[#cccccc80] focus-visible:outline-[#3e4452] focus-visible:outline-solid"
        type="text"
        placeholder="e.g. a, b"
        value={excludeValue}
        onChange={(e) => setExcludeValue(e.currentTarget.value)}
      />
    </label>
  )
}

function sortObject<T extends Record<string, unknown>>(obj: T): T {
  const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b))

  const result = {} as T

  for (const key of keys) {
    result[key] = obj[key]
  }

  return result
}
