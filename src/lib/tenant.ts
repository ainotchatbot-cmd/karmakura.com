import { SITE_CONFIG, type DomainConfig, type DomainSlot } from '../config/site.config.ts';

function normalizeHost(rawHost?: string | null): string {
  if (!rawHost) return '';
  return rawHost.split(':')[0].trim().toLowerCase();
}

export function isValidDomainSlot(value: string | null | undefined): value is DomainSlot {
  return value === 'slot_horoscope' || value === 'slot_tarot' || value === 'slot_dream';
}

export function resolveTenantSlot(options: {
  host?: string | null;
  queryDomain?: string | null;
  headerDomain?: string | null;
}): DomainSlot {
  if (isValidDomainSlot(options.queryDomain)) {
    return options.queryDomain;
  }
  if (isValidDomainSlot(options.headerDomain)) {
    return options.headerDomain;
  }

  const host = normalizeHost(options.host);
  if (host) {
    for (const slot of ['slot_horoscope', 'slot_tarot', 'slot_dream'] as DomainSlot[]) {
      const cfg = SITE_CONFIG[slot];
      const configuredHost = normalizeHost(cfg.defaultHost);
      if (configuredHost && host === configuredHost) {
        return slot;
      }
      if (
        (slot === 'slot_horoscope' && (host.includes('duangtok') || host.includes('horo'))) ||
        (slot === 'slot_tarot' && (host.includes('pilgrim') || host.includes('tarot') || host.includes('lumora'))) ||
        (slot === 'slot_dream' && (host.includes('fanrai') || host.includes('dream') || host.includes('nimit')))
      ) {
        return slot;
      }
    }
  }

  // Clean fallback for localhost / preview URLs
  return 'slot_horoscope';
}

export function getTenantConfig(slot: DomainSlot): DomainConfig {
  return SITE_CONFIG[slot];
}
