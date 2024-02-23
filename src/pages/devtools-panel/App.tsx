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
      console.log('extensionId', extensionId)

      if (extensionId) {
        getProxyStorage(extensionId).then(storage => {
          storage.local
            .get(null)
            .then(data => {
              setTargetState(data)
            })
            .catch(err => {})
        })
      }
    })
    browser.devtools.inspectedWindow.tabId
  }, [])

  return (
    <div className="size-full font-mono flex-column text-[14px] bg-mainBackground p-4 text-iconForeground">
      <div className="flex gap-[12px]">
        <input
          className="bg-[#1d1f23] focus-visible:outline-[#3e4452] focus-visible:outline-solid h-[24px] text-[#abb2bf] py-[3px] ps-[6px] placeholder:text-[#cccccc80] leading-[1.4em]"
          type="text"
          placeholder="Search"
        />

        <div className="px-2 py-1 rounded-[4px] cursor-pointer">
          storage.local
        </div>
        <div className="px-2 py-1 rounded-[4px] cursor-pointer">
          storage.sync
        </div>
        <div className="px-2 py-1 rounded-[4px] cursor-pointer">
          storage.session
        </div>

        <button></button>

        <button
          className="flex-center box-content rounded-[5px] size-[16px] ms-auto p-[3px] disabled:opacity-60 cursor-pointer disabled:cursor-default [&:not(:disabled)]:hover:bg-toolbarHoverBackground"
          style={{
            backgroundSize: '16px',
            backgroundPosition: '50%',
          }}
        >
          <CodiconCollapseAll className="text-[16px]" />
        </button>
      </div>

      {targetState && <span>{JSON.stringify(targetState, null, 2)}</span>}
    </div>
  )
}
