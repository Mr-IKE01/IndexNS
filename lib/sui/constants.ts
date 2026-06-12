// All SuiNS mainnet constants — confirmed from docs.suins.io June 2026

export const SUINS_PACKAGES = {
  CORE_V1: '0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0',
  CORE_V2: '0xb7004c7914308557f7afbaf0dca8dd258e18e306cb7a45b28019f3d0a693f162',
  CORE_V3: '0x00c2f85e07181b90c140b15c5ce27d863f93c4d9159d2a4e7bdaeb40e286d6f5',
  REGISTRATION: '0x9d451fa0139fef8f7c1f0bd5d7e45b7fa9dbb84c2e63c2819c7abd0a7f7d749d',
  RENEWAL: '0xd5e5f74126e7934e35991643b0111c3361827fc0564c83fa810668837c6f0b0f',
} as const

export const SUINS_OBJECTS = {
  CORE: '0x6e0ddefc0ad98889c04bab9639e512c21766c5e6366f89e696956d9be6952871',
  REGISTRY_TABLE: '0xe64cd9db9f829c6cc405d9790bd71567ae07259855f4fba6f02c84f52298c106',
} as const

// 30 days in milliseconds — the fixed SuiNS grace period (not stored on-chain)
export const GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000 // 2_592_000_000

// Dynamic field name type — uses CORE_V1 because the registry was created by V1
export const DOMAIN_FIELD_TYPE =
  `${SUINS_PACKAGES.CORE_V1}::domain::Domain` as const

// Event types for incremental sync via GraphQL
export const EVENTS = {
  REGISTERED_V3: `${SUINS_PACKAGES.CORE_V3}::registry::NameRegistered`,
  RENEWED_V3: `${SUINS_PACKAGES.RENEWAL}::renewal::NameRenewed`,
} as const

// Sui mainnet GraphQL endpoint
export const SUI_GRAPHQL_URL = 'https://sui-mainnet.mystenlabs.com/graphql'

// Bootstrap: items fetched per listDynamicFields call
// Increased from 50 to 100 — concurrent prefetch pipeline absorbs the extra cost
export const DYNAMIC_FIELDS_PAGE_SIZE = 100

// Bootstrap: max pages processed per single /api/sync invocation
// 15 pages × 100 domains × ~3.5s per page (with prefetch pipeline) ≈ 52s,
// fits inside Vercel's 60s maxDuration with buffer
export const MAX_PAGES_PER_INVOCATION = 15
