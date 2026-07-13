import { prisma } from '../prisma'
import { config } from '../config'

// ---------------------------------------------------------------------------
// Editable storefront settings, stored as key/value rows in the Setting table.
// Only the keys below are recognised. Each falls back to an env/config default
// when it has never been set in the admin panel.
// ---------------------------------------------------------------------------

export const SETTING_DEFAULTS: Record<string, string> = {
  bkashNumber: config.payment.bkashNumber,
  nagadNumber: config.payment.nagadNumber,
}

export type SettingKey = keyof typeof SETTING_DEFAULTS
export const SETTING_KEYS = Object.keys(SETTING_DEFAULTS) as SettingKey[]

/** All public settings, with defaults filled in for anything never set. */
export async function getPublicSettings(): Promise<Record<SettingKey, string>> {
  const rows = await prisma.setting.findMany({ where: { key: { in: SETTING_KEYS } } })
  const byKey = new Map(rows.map((r) => [r.key, r.value]))
  const out = {} as Record<SettingKey, string>
  for (const key of SETTING_KEYS) out[key] = byKey.get(key) ?? SETTING_DEFAULTS[key]
  return out
}

/** Upsert a partial set of settings (unknown keys are ignored). */
export async function saveSettings(patch: Partial<Record<SettingKey, string>>): Promise<void> {
  const entries = Object.entries(patch).filter(([k]) => SETTING_KEYS.includes(k as SettingKey))
  await Promise.all(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: value ?? '' },
        create: { key, value: value ?? '' },
      }),
    ),
  )
}