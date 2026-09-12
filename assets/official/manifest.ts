/**
 * OFFICIAL ASSET MANIFEST
 * =======================
 *
 * This file is the ONLY place where official association artwork enters the
 * app bundle. It ships empty on purpose: the repository contains no logo, no
 * image of Sri Narayana Guru and no image of Koti-Chennaya, because those
 * files must come from the association — not from a generator, a stock library
 * or an approximation.
 *
 * To install the real assets, see docs/ASSET_REPLACEMENT.md. In short:
 *
 *   1. Drop the approved file into assets/official/<folder>/
 *   2. Add an entry below with its true pixel dimensions and version
 *   3. Run `npm run verify`
 *
 * Example entry (copy, uncomment, adjust):
 *
 *   {
 *     id: 'asset.association.logo',
 *     name: 'Billawar Association Mumbai — Official Logo',
 *     category: 'ASSOCIATION_LOGO',
 *     source: { kind: 'bundled', module: require('./association/billawar-association-logo-v1.png') },
 *     type: 'image/png',
 *     width: 1024,
 *     height: 1024,
 *     checksum: manifestFingerprint({ id: 'asset.association.logo', version: 1, width: 1024, height: 1024 }),
 *     version: 1,
 *     approved: true,
 *     protected: true,
 *     approvedBy: 'Head Office',
 *     approvedAt: '2026-01-01',
 *     fillsSlot: 'slot.association.logo',
 *   },
 *
 * Until an entry exists, every template that needs that asset shows
 * "Approved asset required." and export is blocked by validation.
 */
import type { OfficialAsset } from '@/domain/types/assets';

export interface BundledAssetEntry extends OfficialAsset {
  /** The declared slot this binary fills (see src/domain/assets/slots.ts). */
  readonly fillsSlot: string;
}

export const BUNDLED_OFFICIAL_ASSETS: readonly BundledAssetEntry[] = [];
