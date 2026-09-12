import { checkOperation, isProtected, policyFor, policySummary } from '@/domain/assets/policy';
import { AssetRegistry } from '@/domain/assets/registry';
import { ASSET_OPERATIONS } from '@/domain/types/assets';
import { makeAsset } from './fixtures';

describe('protected asset policy', () => {
  const logo = makeAsset({ id: 'logo', category: 'ASSOCIATION_LOGO', name: 'Association logo' });
  const guru = makeAsset({ id: 'guru', category: 'GURU_IMAGE', name: 'Narayana Guru' });
  const decoration = makeAsset({
    id: 'border',
    category: 'DECORATION',
    name: 'Border',
    protected: false,
  });

  it('treats every identity category as protected', () => {
    expect(isProtected(logo)).toBe(true);
    expect(isProtected(guru)).toBe(true);
    expect(isProtected(decoration)).toBe(false);
  });

  it.each([
    'nonUniformScale',
    'recolor',
    'flipHorizontal',
    'flipVertical',
    'stylize',
    'aiRegenerate',
    'aiEnhance',
    'aiBackgroundRemoval',
    'autoReplace',
    'replaceWithGeneratedImage',
    'rotate',
  ] as const)('denies %s on a protected asset', (operation) => {
    const result = checkOperation(guru, operation);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(10);
  });

  it.each(['position', 'uniformScale', 'replaceFromApprovedLibrary', 'crop'] as const)(
    'allows %s on a protected asset',
    (operation) => {
      expect(checkOperation(guru, operation).ok).toBe(true);
    },
  );

  it('never allows an AI-generated image to stand in for an official asset', () => {
    for (const asset of [logo, guru, decoration]) {
      expect(policyFor(asset).replaceWithGeneratedImage).toBe(false);
      expect(policyFor(asset).aiRegenerate).toBe(false);
      expect(policyFor(asset).stylize).toBe(false);
    }
  });

  it('refuses every operation on an unapproved asset', () => {
    const pending = makeAsset({ id: 'pending', category: 'OFFICIAL_PHOTO', approved: false });
    for (const operation of ASSET_OPERATIONS) {
      const result = checkOperation(pending, operation);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain('Approved asset required');
    }
  });

  it('keeps protected assets clearly visible', () => {
    expect(checkOperation(guru, 'opacity', { opacity: 0.95 }).ok).toBe(true);
    expect(checkOperation(guru, 'opacity', { opacity: 0.2 }).ok).toBe(false);
  });

  it('rejects crop shapes outside the approved list', () => {
    expect(checkOperation(guru, 'crop', { cropMode: 'centerCircle' }).ok).toBe(true);
    expect(checkOperation(guru, 'crop', { cropMode: 'freeform' as never }).ok).toBe(false);
  });

  it('summarises the policy for the editor panel', () => {
    const rows = policySummary(guru);
    expect(rows.find((row) => row.label === 'AI regenerate')?.allowed).toBe(false);
    expect(rows.find((row) => row.label === 'Position')?.allowed).toBe(true);
  });
});

describe('asset registry', () => {
  it('forces identity categories to be protected even if the manifest says otherwise', () => {
    const registry = new AssetRegistry();
    registry.register(
      makeAsset({ id: 'sneaky', category: 'GURU_IMAGE', protected: false }),
      'bundled-manifest',
    );
    expect(registry.get('sneaky')?.protected).toBe(true);
  });

  it('refuses to replace a published asset with an older version', () => {
    const registry = new AssetRegistry();
    registry.register(makeAsset({ id: 'logo', category: 'ASSOCIATION_LOGO', version: 3 }), 'backend-sync');
    const result = registry.register(
      makeAsset({ id: 'logo', category: 'ASSOCIATION_LOGO', version: 2 }),
      'backend-sync',
    );
    expect(result.ok).toBe(false);
    expect(registry.get('logo')?.version).toBe(3);
  });

  it('raises a readable error when a poster needs an asset that is gone', () => {
    const registry = new AssetRegistry();
    expect(() => registry.require('missing')).toThrow(/no longer available/i);
  });

  it('raises "approved asset required" for an unapproved asset', () => {
    const registry = new AssetRegistry();
    registry.register(makeAsset({ id: 'pending', category: 'TEMPLE_IMAGE', approved: false }), 'admin-publish');
    expect(() => registry.require('pending')).toThrow(/not been approved/i);
  });
});
