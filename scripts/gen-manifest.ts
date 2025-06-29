import fsExta from 'fs-extra'
import type { Manifest } from 'webextension-polyfill'
import { isDev, isFirefoxEnv, r } from './utils.js'

type ChromiumPermissions = 'sidePanel'
type Permissions =
  | Manifest.PermissionNoPrompt
  | Manifest.OptionalPermission
  | ChromiumPermissions

type OptionalPermissions = Manifest.OptionalPermission
type MV2Keys = 'browser_action' | 'user_scripts' | 'page_action'

type ChromiumManifest = {
  side_panel?: {
    default_path: string
  }
  update_url?: string
}

type StrictManifest = {
  permissions?: Permissions[]
  optional_permissions?: OptionalPermissions[]
}

type MV3 = Omit<Manifest.WebExtensionManifest, MV2Keys | keyof StrictManifest> &
  ChromiumManifest &
  StrictManifest

function generateManifest() {
  const manifest: MV3 = {
    manifest_version: 3,
    name: 'Webext Storage',
    version: '0.0.0.1',
    background: isFirefoxEnv
      ? { scripts: ['./background/mian.js'], type: 'module' }
      : { service_worker: './background/main.js', type: 'module' },
    permissions: [] as Permissions[],
    host_permissions: ['<all_urls>'],
    optional_permissions: [] as OptionalPermissions[],
    devtools_page: './devtools/index.html',
  }

  if (isFirefoxEnv) {
    manifest.browser_specific_settings = {
      gecko: {
        id: '[ID]',
        strict_min_version: '115.0',
      },
    }
  } else {
    manifest.minimum_chrome_version = '100'
  }

  return manifest
}

console.log('write manifest')
fsExta.writeJSONSync(r('dist/dev/manifest.json'), generateManifest(), {
  spaces: 2,
})
