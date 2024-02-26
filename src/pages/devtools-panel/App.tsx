import {
  createContext,
  useContextSelector,
} from '@fluentui/react-context-selector'
import { useEffect, useState } from 'react'
import { CodiconCollapseAll, CodiconExpandAll } from '~/icons'
import { evalFn, getProxyStorage } from '~/utils'

export function App() {
  const [targetState, setTargetState] = useState<Record<string, unknown>>()

  useEffect(() => {
    // getProxyStorage()
    evalFn(chrome => {
      const location = document.location
      if (
        !location ||
        location.protocol === 'chrome-extension:' ||
        location.protocol === 'moz-extension:'
      ) {
        return chrome.runtime.id
      }

      return
    }).then(extensionId => {
      if (extensionId) {
        getProxyStorage(extensionId).then(storage => {
          storage.local
            .get(null)
            .then(data => {
              setTargetState(data)
            })
            .catch(err => {})

          storage.local.onChanged.addListener(changes => {})
        })
      }
    })
    browser.devtools.inspectedWindow.tabId
  }, [])

  return (
    <CtxProvider>
      <div className="size-full font-sans flex-column text-[14px] bg-mainBackground text-foreground">
        <div className="flex-align gap-[12px] px-[8px] h-[40px]">
          <SearchInput />

          <div className="px-2 py-1 bg-button.background hover:bg-button.hoverBackground cursor-pointer">
            storage.local
          </div>
          <div className="px-2 py-1 bg-button.background hover:bg-button.hoverBackground cursor-pointer">
            storage.sync
          </div>
          <div className="px-2 py-1 bg-button.background hover:bg-button.hoverBackground cursor-pointer">
            storage.session
          </div>

          <button></button>

          <button
            className="flex-center box-content rounded-[5px] size-[16px] ms-auto p-[3px] disabled:opacity-60 cursor-pointer disabled:cursor-default [&:not(:disabled)]:hover:bg-toolbar.hoverBackground"
            style={{
              backgroundSize: '16px',
              backgroundPosition: '50%',
            }}
          >
            <CodiconCollapseAll className="text-[16px]" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-clip  scrollbar-button:hidden scrollbar:size-[10px] scrollbar-thumb:bg-scrollbarSlider.background hover:scrollbar-thumb:bg-scrollbarSlider.hoverBackground active:scrollbar-thumb:bg-scrollbarSlider.activeBackground font-mono">
          {targetState &&
            Object.entries(targetState).map(([key, value], index) => {
              return <KeyDisplay key={key} property={key} value={value} />
            })}
        </div>
      </div>
    </CtxProvider>
  )
}

function KeyDisplay({ property, value }: { property: string; value: unknown }) {
  const searchValue = useContextSelector(Ctx, ctx =>
    ctx.searchValue.toLocaleLowerCase()
  )

  if (searchValue && !property.toLowerCase().includes(searchValue)) {
    return null
  }

  return (
    <div className="flex-between h-[22px] leading-[22px] px-[12px]">
      <div>{property}</div>
      {/* <div>{value}</div> */}
    </div>
  )
}

const Ctx = createContext({
  expandedNodes: [] as string[][],
  selectedNodes: [] as string[][],
  searchValue: '',
  setSearchValue: (value: string) => {},
})

function CtxProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [expandedNodes, setExpandedNodes] = useState<string[][]>([])
  const [selectedNodes, setSelectedNodes] = useState<string[][]>([])
  const [searchValue, setSearchValue] = useState('')

  return (
    <Ctx.Provider
      value={{
        expandedNodes,
        selectedNodes,
        searchValue,
        setSearchValue,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

function SearchInput() {
  const searchValue = useContextSelector(Ctx, ctx => ctx.searchValue)
  const setSearchValue = useContextSelector(Ctx, ctx => ctx.setSearchValue)

  return (
    <input
      className="bg-[#1d1f23] focus-visible:outline-[#3e4452] focus-visible:outline-solid h-[24px] text-[#abb2bf] py-[3px] ps-[6px] placeholder:text-[#cccccc80] leading-[1.4em]"
      type="text"
      placeholder="Search"
      value={searchValue}
      onChange={e => setSearchValue(e.currentTarget.value)}
    />
  )
}
