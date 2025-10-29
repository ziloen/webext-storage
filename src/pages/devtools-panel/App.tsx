import { listenEvent } from '@ziloen/webext-utils'
import clsx from 'clsx'
import { noop } from 'es-toolkit'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createContext, useContextSelector } from 'use-context-selector'
import type { Storage } from 'webextension-polyfill'
import { useGetState, useLatest, useMemoizedFn } from '~/hooks'
import { CarbonChevronRight, CodiconCollapseAll } from '~/icons'
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
    { key: string; normalizedKey: string | null; value: unknown }
  > | null>(null)
  const [highlightKeys, setHighlightKeys] = useState(
    new Map<
      string,
      [
        type: 'added' | 'modified' | 'deleted' | 'ignored',
        timer: ReturnType<typeof setTimeout>,
      ]
    >(),
  )
  const latestHighlightKeys = useLatest(highlightKeys)
  const unmountSignal = useUnmountSignal()
  const [expandedKeys, setExpandedKeys, getExpandedKeys] = useGetState(
    () => new Set<string>(),
  )

  const [bytesInUse, setBytesInUse] = useState(0)

  const [bytesInUseByKey, setBytesInUseByKey] = useState(
    new Map<string, number>(),
  )

  const proxyStorageRef = useRef<Storage.Static | null>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = useMemoizedFn(async () => {
    const extensionId = await evalFn((ext) => {
      const location = document.location
      if (
        !location ||
        location.protocol === 'chrome-extension:' ||
        location.protocol === 'moz-extension:'
      ) {
        return ext.runtime.id
      }

      return
    })

    if (!extensionId) return
    const storage = await getProxyStorage(extensionId)

    proxyStorageRef.current = storage

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
            nextState[key] = {
              key,
              normalizedKey: getNormalizedIdKey(key),
              value: change.newValue,
            }
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
      { signal: unmountSignal },
    )
  })

  const onToggleExpand = useMemoizedFn((normalizedKey: string | null) => {
    if (normalizedKey === null) return

    const currentExpandedKeys = getExpandedKeys()
    const nextExpandedKeys = new Set(currentExpandedKeys)

    if (nextExpandedKeys.has(normalizedKey)) {
      nextExpandedKeys.delete(normalizedKey)
    } else {
      nextExpandedKeys.add(normalizedKey)
    }

    setExpandedKeys(nextExpandedKeys)
  })

  const onPointerEnterKey = useMemoizedFn((key: string) => {
    const storage = proxyStorageRef.current
    if (!storage) return

    storage.local.getBytesInUse?.(key).then((bytes) => {
      setBytesInUseByKey((pre) => {
        const next = new Map(pre)
        next.set(key, bytes)
        return next
      })
    })
  })

  const keysReactNode = useMemo(() => {
    if (!targetState) return null

    const result = []

    const seenIdKeys = new Set<string>()
    for (const [key, value] of Object.entries(targetState)) {
      const bytesInUse = bytesInUseByKey.get(value.key)

      if (value.normalizedKey) {
        const expanded = expandedKeys.has(value.normalizedKey)

        if (!seenIdKeys.has(value.normalizedKey)) {
          seenIdKeys.add(value.normalizedKey)
          result.push(
            <KeyDisplay
              key={value.key}
              property={value.key}
              bytesInUse={bytesInUse}
              normalizedKey={value.normalizedKey}
              onToggleExpand={onToggleExpand}
              onPointerEnter={() => onPointerEnterKey(value.key)}
              value={value.value}
              expanded={expanded}
              indent={0}
            />,
          )
        } else if (expanded) {
          result.push(
            <KeyDisplay
              key={value.key}
              property={value.key}
              bytesInUse={bytesInUse}
              value={value.value}
              expanded={undefined}
              indent={1}
              normalizedKey={value.normalizedKey}
              onToggleExpand={onToggleExpand}
              onPointerEnter={() => onPointerEnterKey(value.key)}
            />,
          )
        }
      } else {
        result.push(
          <KeyDisplay
            key={value.key}
            property={value.key}
            value={value.value}
            expanded={undefined}
            indent={0}
            normalizedKey={value.normalizedKey}
            bytesInUse={bytesInUse}
            onToggleExpand={onToggleExpand}
            onPointerEnter={() => onPointerEnterKey(value.key)}
          />,
        )
      }
    }

    return result
  }, [targetState, expandedKeys, bytesInUseByKey])

  return (
    <CtxProvider modifiedKeys={highlightKeys}>
      <div className="bg-main-background text-foreground flex size-full flex-col font-sans text-[14px]">
        <div className="flex h-[40px] items-center gap-[12px] px-[8px]">
          <SearchInput />

          <SearchExclude />

          <div className="bg-button_background hover:bg-button_hover-background cursor-pointer px-2 py-1">
            storage.local
          </div>

          <span>{formatBytes(bytesInUse)}</span>

          <button
            className="flex-center not-disabled:hover:bg-toolbar_hover-background ms-auto box-content size-[16px] cursor-pointer rounded-[5px] p-[3px] disabled:cursor-default disabled:opacity-60"
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
            'webkit-scrollbar:size-[10px] webkit-scrollbar-thumb:bg-scrollbar-slider_background hover:webkit-scrollbar-thumb:bg-scrollbar-slider_hover-background active:webkit-scrollbar-thumb:bg-scrollbar-slider_active-background webkit-scrollbar-button:hidden',
          )}
        >
          {keysReactNode}
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

  return `${parseFloat(bytes.toFixed(2))}${labels[n] ?? 'B'}`
}

function KeyDisplay({
  property,
  value,
  expanded,
  normalizedKey,
  indent,
  bytesInUse,
  onToggleExpand,
  onPointerEnter,
}: {
  property: string
  normalizedKey: string | null
  value: unknown
  expanded: boolean | undefined
  indent: number
  bytesInUse?: number | undefined
  onToggleExpand: (property: string) => void
  onPointerEnter: () => void
}) {
  const searchValue = useContextSelector(Ctx, (ctx) => ctx.searchValue)

  const excludeArr = useContextSelector(Ctx, (ctx) => ctx.excludeArr)

  const status = useContextSelector(Ctx, (ctx) =>
    ctx.modifiedKeys.has(property) ? ctx.modifiedKeys.get(property)![0] : null,
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

    const stringifiedValue = stringifiedValueRef.current ?? stringfyValue()

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
      className={clsx(
        'group flex h-[22px] leading-[22px] hover:bg-white/5',
        expanded && 'sticky top-0',
      )}
      data-status={status}
      onPointerEnter={onPointerEnter}
    >
      <div
        className={clsx(
          'flex w-full items-center pe-3',
          'duration-1000',
          'group-data-[status=added]:text-added-foreground group-data-[status=added]:duration-0',
          'group-data-[status=deleted]:text-deleted-foreground group-data-[status=deleted]:duration-0',
          'group-data-[status=ignored]:text-ignored-foreground',
          'group-data-[status=modified]:text-modified-foreground group-data-[status=modified]:bg-white/5 group-data-[status=modified]:duration-0',
        )}
        style={{
          transitionProperty:
            'color, background-color, border-color, text-decoration-color, fill, stroke',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          paddingLeft: `${indent * 16}px`,
        }}
      >
        {expanded === undefined ? (
          <div className="mr-1 size-[16px]"></div>
        ) : (
          <CarbonChevronRight
            width={16}
            height={16}
            className={clsx('mr-1 cursor-pointer', expanded && 'rotate-90')}
            onClick={() => {
              onToggleExpand(normalizedKey!)
            }}
          />
        )}

        {property}

        {!!bytesInUse && (
          <span className="text-light-gray-900 ms-2 text-xs">
            {formatBytes(bytesInUse)}
          </span>
        )}
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
        onChange={(e) => setSearchValue(e.currentTarget.value.toLowerCase())}
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

function sortObject<T extends Record<string, unknown>>(obj: T) {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const keys = Object.keys(obj).sort(new Intl.Collator().compare)

  const result = {} as Record<
    string,
    { key: string; normalizedKey: string | null; value: unknown }
  >

  for (const key of keys) {
    const normalizedKey = getNormalizedIdKey(key)
    result[key] = {
      key,
      normalizedKey: normalizedKey ?? null,
      value: obj[key],
    }
  }

  return result
}

const regexPatterns = [
  /[a-f\d]{24}/,
  /[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}/,
]

/**
 * 如果带有 mongodb 的 ObjectId，或者是 uuid v4 的字符，返回相同的 key
 * @example
 * ```ts
 * const key1 = getNormalizedIdKey('key:60c72b2f9b1e8c001c8e4d3a')
 * //    ^ 'key:[id]'
 * const key2 = getNormalizedIdKey('key:123e4567-e89b-12d3-a456-426614174000')
 * //    ^ 'key:[id]'
 * const key3 = getNormalizedIdKey('key:normal_value')
 * //    ^ null
 * ```
 */
function getNormalizedIdKey(key: string): string | null {
  let matched = false

  const replacer = () => {
    matched = true
    return '[id]'
  }

  for (const pattern of regexPatterns) {
    const newKey = key.replace(pattern, replacer)
    if (matched) {
      return newKey
    }
  }

  return null
}
