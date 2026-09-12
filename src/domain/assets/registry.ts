import type { AssetCategory, OfficialAsset } from '@/domain/types/assets';
import { IDENTITY_CATEGORIES } from '@/domain/types/assets';
import { AppError } from '@/utils/errors';
import { err, ok, type Result } from '@/utils/result';

/**
 * Who is allowed to write to the official asset registry.
 *
 * Note what is NOT in this union: there is no `'ai'` source. No AI service, and
 * no code path reachable from one, can add, replace or overwrite an official
 * asset. New assets enter only through the bundled manifest or a signed sync
 * from the association backend (upload → verify → approve → publish).
 */
export type RegistryMutationSource = 'bundled-manifest' | 'backend-sync' | 'admin-publish';

export interface AssetQuery {
  readonly category?: AssetCategory;
  readonly categories?: readonly AssetCategory[];
  readonly officeId?: string;
  readonly search?: string;
  readonly includeUnapproved?: boolean;
}

/**
 * In-memory, offline-first registry of official assets.
 *
 * The registry is a read-mostly store: it is populated at app start from the
 * bundled manifest, optionally topped up by a backend sync, and then only read.
 */
export class AssetRegistry {
  private readonly assets = new Map<string, OfficialAsset>();

  register(asset: OfficialAsset, source: RegistryMutationSource): Result<OfficialAsset, string> {
    const normalised = normaliseAsset(asset);

    const existing = this.assets.get(normalised.id);
    if (existing) {
      if (source === 'bundled-manifest') {
        // The bundled manifest never wins over a newer published version.
        if (existing.version >= normalised.version) return ok(existing);
      }
      if (normalised.version < existing.version) {
        return err(
          `"${normalised.name}" is older (version ${normalised.version}) than the copy already installed (version ${existing.version}) and was not applied.`,
        );
      }
    }

    this.assets.set(normalised.id, normalised);
    return ok(normalised);
  }

  registerMany(assets: readonly OfficialAsset[], source: RegistryMutationSource): void {
    for (const asset of assets) {
      const result = this.register(asset, source);
      if (!result.ok && __DEV__) {
        // Surfaced in dev only; production sync reports through the sync service.
        console.warn(`[AssetRegistry] ${result.error}`);
      }
    }
  }

  get(id: string): OfficialAsset | undefined {
    return this.assets.get(id);
  }

  /**
   * Resolve an asset that a poster depends on. Used by the renderer, validation
   * and export so that a missing or unapproved asset fails loudly and legibly
   * instead of rendering a blank box.
   */
  require(id: string): OfficialAsset {
    const asset = this.assets.get(id);
    if (!asset) {
      throw new AppError(
        'ASSET_UNAVAILABLE',
        'One of the images used by this poster is no longer available.',
        { remedy: 'Open the poster editor and choose another approved image from the asset library.' },
      );
    }
    if (!asset.approved) {
      throw new AppError('ASSET_NOT_APPROVED', `"${asset.name}" has not been approved by the association.`, {
        remedy: 'Approved asset required — please pick an approved image from the asset library.',
      });
    }
    return asset;
  }

  has(id: string): boolean {
    return this.assets.has(id);
  }

  all(): readonly OfficialAsset[] {
    return [...this.assets.values()];
  }

  query({ category, categories, officeId, search, includeUnapproved = false }: AssetQuery = {}): readonly OfficialAsset[] {
    const wanted = categories ?? (category ? [category] : undefined);
    const needle = search?.trim().toLowerCase();

    return this.all()
      .filter((asset) => includeUnapproved || asset.approved)
      .filter((asset) => !wanted || wanted.includes(asset.category))
      .filter((asset) => !officeId || !asset.officeIds || asset.officeIds.includes(officeId))
      .filter((asset) => {
        if (!needle) return true;
        const haystack = `${asset.name} ${asset.description ?? ''} ${(asset.tags ?? []).join(' ')}`.toLowerCase();
        return haystack.includes(needle);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Section model used by the Official Asset Library screen. */
  groupedByCategory(officeId?: string): ReadonlyMap<AssetCategory, readonly OfficialAsset[]> {
    const grouped = new Map<AssetCategory, OfficialAsset[]>();
    for (const asset of this.query(officeId ? { officeId } : {})) {
      const bucket = grouped.get(asset.category) ?? [];
      bucket.push(asset);
      grouped.set(asset.category, bucket);
    }
    return grouped;
  }

  clear(): void {
    this.assets.clear();
  }
}

/** Identity categories are forced to `protected`, regardless of what was supplied. */
function normaliseAsset(asset: OfficialAsset): OfficialAsset {
  const mustBeProtected = IDENTITY_CATEGORIES.includes(asset.category);
  if (mustBeProtected && !asset.protected) {
    return Object.freeze({ ...asset, protected: true });
  }
  return Object.freeze({ ...asset });
}

export const assetRegistry = new AssetRegistry();

declare const __DEV__: boolean;
