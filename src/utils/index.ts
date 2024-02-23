import { serializeError } from 'serialize-error'
import type { Runtime, Storage } from 'webextension-polyfill'

export async function evalFn<A extends unknown[]>(
  closure: (chrome: typeof browser, ...args: A) => void,
  ...args: A
) {
  const code = `(${closure.toString()})(chrome, ${args
    .map(_ => JSON.stringify(_))
    .join(', ')})`

  // const result = await polyfillEval(code)
  const result = await browser.devtools.inspectedWindow.eval(code)
  const [value, info] = result

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
  } catch (error) {}

  port.onMessage.addListener(
    async (
      message: {
        areaName: 'sync' | 'local' | 'managed' | 'session'
        method: 'clear' | 'get' | 'remove' | 'set'
        args: unknown[]
        id: string
      },
      port: Runtime.Port
    ) => {
      const { areaName, method, args, id } = message

      try {
        // @ts-expect-error
        const result = await chrome.storage[areaName][method](...args)
        port.postMessage({
          type: 'forward-storage',
          data: result,
          id,
        })
      } catch (error) {
        port.postMessage({
          type: 'forward-storage',
          error: serializeError(error),
          id,
        })
      }
    }
  )
}

export async function getProxyStorage(extensionId: string) {
  return new Promise<Storage.Static>((resolve, reject) => {
    browser.runtime.onConnectExternal.addListener(port => {
      if (port.sender?.id !== extensionId) return

      const deferMap = new Map<string, PromiseWithResolvers<unknown>>()

      port.onMessage.addListener(message => {
        if (message.type === 'forward-storage') {
          const id = message.id
          const defer = deferMap.get(id)
          if (defer) {
            if (message.error) {
              defer.reject(message.error)
            } else {
              defer.resolve(message.data)
            }
            deferMap.delete(id)
          }
        }
      })

      const proxyStorage = new Proxy({} as Storage.Static, {
        get(_, areaName) {
          return new Proxy(
            {},
            {
              get(_, method) {
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
