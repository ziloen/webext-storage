import type { Runtime, Storage } from 'webextension-polyfill'

export async function evalFn<Args extends unknown[], Return>(
  closure: (chrome: typeof browser, ...args: Args) => Return,
  ...args: Args
) {
  const code = `(${closure.toString()})(chrome, ${args
    .map(_ => JSON.stringify(_))
    .join(', ')})`

  const result = await browser.devtools.inspectedWindow.eval(code)
  const value = result[0] as Return
  const info = result[1]

  if (info && (info.isError || info.isException)) {
    throw new Error(info.value || info.description)
  }

  return value
}

function extensionPageInject(chrome: typeof browser, runtimeId: string) {
  const port = chrome.runtime.connect(runtimeId, { name: 'storage' })

  try {
    if (chrome.storage) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        port.postMessage({
          type: 'changed',
          data: { changes, areaName },
        })
      })
    }
  } catch {}

  port.onMessage.addListener(async (message, port) => {
    const { areaName, method, args, id } = message as {
      areaName: 'sync' | 'local' | 'managed' | 'session'
      method: 'clear' | 'get' | 'remove' | 'set'
      args: unknown[]
      id: string
    }

    try {
      // @ts-expect-error just ignore it
      const result = await chrome.storage[areaName][method](...args)
      port.postMessage({
        type: 'forward-storage',
        data: result,
        id,
      })
    } catch (error) {
      port.postMessage({
        type: 'forward-storage',
        error: error instanceof Error ? error.message : String(error),
        id,
      })
    }
  })
}

export async function getProxyStorage(extensionId: string) {
  return new Promise<Storage.Static>((resolve, reject) => {
    browser.runtime.onConnectExternal.addListener(port => {
      if (port.sender?.id !== extensionId) return

      const deferMap = new Map<string, PromiseWithResolvers<unknown>>()

      type ChangedCallback = (
        changes: Record<string, Storage.StorageChange>
      ) => void

      type AreaName = 'local' | 'sync' | 'managed' | 'session'

      const listenersMap = {
        local: new Set<ChangedCallback>(),
        sync: new Set<ChangedCallback>(),
        managed: new Set<ChangedCallback>(),
        session: new Set<ChangedCallback>(),
      }

      port.onMessage.addListener(message => {
        if (message.type === 'forward-storage') {
          const id = message.id
          const defer = deferMap.get(id)
          if (defer) {
            if (message.error) {
              console.log('error', message.error)
              defer.reject(new Error(message.error))
            } else {
              defer.resolve(message.data)
            }
            deferMap.delete(id)
          }
        } else if (message.type === 'changed') {
          const { changes, areaName } = message.data as {
            changes: Record<string, Storage.StorageChange>
            areaName: AreaName
          }

          listenersMap[areaName]?.forEach(listener => listener(changes))
        }
      })

      const proxyStorage = new Proxy({} as Storage.Static, {
        get(_, areaName: AreaName) {
          return new Proxy(
            {},
            {
              get(_, method) {
                if (method === 'onChanged') {
                  return {
                    addListener(listener: ChangedCallback) {
                      listenersMap[areaName]?.add(listener)
                    },
                    removeListener(listener: ChangedCallback) {
                      listenersMap[areaName]?.delete(listener)
                    },
                  }
                }

                return function (...args: unknown[]) {
                  const defer = Promise.withResolvers()
                  const id = crypto.randomUUID()

                  deferMap.set(id, defer)
                  port.postMessage({ areaName, method, args, id })

                  return defer.promise
                }
              },
            }
          )
        },
      })

      resolve(proxyStorage)
    })

    evalFn(extensionPageInject, browser.runtime.id)
  })
}
