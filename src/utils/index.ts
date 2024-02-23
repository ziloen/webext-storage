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
      },
      port: Runtime.Port
    ) => {
      const { areaName, method, args } = message

      try {
        // @ts-expect-error
        const result = await chrome.storage[areaName][method](...args)
        port.postMessage({ type: 'forward-storage', data: result })
      } catch (error) {
        port.postMessage({ error: serializeError(error) })
      }
    }
  )
}

export async function getProxyStorage(extensionId: string) {
  return new Promise<Storage.Static>((resolve, reject) => {
    browser.runtime.onConnectExternal.addListener(port => {
      if (port.sender?.id !== extensionId) return

      port.onMessage.addListener(message => {
        console.log('message', message)
      })

      const proxyStorage = new Proxy({} as Storage.Static, {
        get(target, areaName) {
          return new Proxy(
            {},
            {
              get(target, method) {
                return function (...args: unknown[]) {
                  return new Promise((resolve, reject) => {
                    if (!port) {
                      return reject(new Error('Port is not connected'))
                    }

                    port.postMessage({ areaName, method, args })

                    port.onMessage.addListener(() => {})
                  })
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
