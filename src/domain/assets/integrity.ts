import type { OfficialAsset } from '@/domain/types/assets';
import { fnv1a32 } from '@/utils/checksum';

export interface IntegrityIssue {
  readonly assetId: string;
  readonly assetName: string;
  readonly reason: string;
}

/**
 * Structural integrity checks that can run offline, with no access to the
 * binary itself. A full byte-level hash comparison happens during backend sync
 * (docs/BACKEND.md) — this pass catches manifest mistakes at app start, e.g. an
 * asset published without dimensions, which would make aspect-ratio-preserving
 * scaling impossible.
 */
export function checkAssetIntegrity(asset: OfficialAsset): readonly IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const push = (reason: string): void => {
    issues.push({ assetId: asset.id, assetName: asset.name, reason });
  };

  if (asset.width <= 0 || asset.height <= 0) {
    push('The asset has no recorded pixel size, so it cannot be placed without distorting it.');
  }
  if (!asset.checksum) {
    push('The asset has no integrity fingerprint and cannot be verified.');
  }
  if (asset.version < 1) {
    push('The asset has an invalid version number.');
  }
  if (asset.source.kind === 'bundled' && asset.source.module === undefined) {
    push('The asset is marked as bundled but no bundled file is linked to it.');
  }
  if (asset.source.kind !== 'bundled' && !asset.source.uri) {
    push('The asset has no file location.');
  }
  return issues;
}

/** Fingerprint used by the bundled manifest; the backend recomputes it over bytes. */
export function manifestFingerprint(asset: Pick<OfficialAsset, 'id' | 'version' | 'width' | 'height'>): string {
  return fnv1a32(`${asset.id}:${asset.version}:${asset.width}x${asset.height}`);
}

export function auditRegistry(assets: readonly OfficialAsset[]): readonly IntegrityIssue[] {
  return assets.flatMap(checkAssetIntegrity);
}
