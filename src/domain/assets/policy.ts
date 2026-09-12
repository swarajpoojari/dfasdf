import {
  APPROVED_CROP_MODES,
  IDENTITY_CATEGORIES,
  PROTECTED_ASSET_POLICY,
  PROTECTED_MIN_OPACITY,
  STANDARD_ASSET_POLICY,
  type AssetOperation,
  type AssetPolicy,
  type CropMode,
  type OfficialAsset,
} from '@/domain/types/assets';
import { err, ok, type Result } from '@/utils/result';

/** An identity category always yields the protected policy, whatever the flag says. */
export function isIdentityAsset(asset: Pick<OfficialAsset, 'category'>): boolean {
  return IDENTITY_CATEGORIES.includes(asset.category);
}

export function isProtected(asset: Pick<OfficialAsset, 'category' | 'protected'>): boolean {
  return asset.protected || isIdentityAsset(asset);
}

export function policyFor(asset: Pick<OfficialAsset, 'category' | 'protected'>): AssetPolicy {
  return isProtected(asset) ? PROTECTED_ASSET_POLICY : STANDARD_ASSET_POLICY;
}

/**
 * Explanations are written for a non-technical association member, so the
 * editor can show the denial reason verbatim.
 */
const DENIAL_REASON: Record<AssetOperation, string> = {
  position: 'This asset cannot be moved.',
  uniformScale: 'This asset cannot be resized.',
  nonUniformScale: 'Official assets keep their original proportions and cannot be stretched or squashed.',
  rotate: 'Official assets cannot be rotated.',
  opacity: 'This asset must stay fully visible.',
  crop: 'Only the approved crop shapes may be used on an official asset.',
  mask: 'Only approved frames may be used on an official asset.',
  recolor: 'Official assets cannot be recoloured — the approved colours are part of the identity.',
  flipHorizontal: 'Official assets cannot be mirrored.',
  flipVertical: 'Official assets cannot be flipped.',
  stylize: 'Official assets cannot be stylised or filtered.',
  aiRegenerate: 'Official assets are never generated or redrawn by AI. Use the approved asset from the library.',
  aiEnhance: 'AI enhancement is not allowed on official assets — they are used exactly as supplied.',
  aiBackgroundRemoval: 'Background removal is not allowed on official assets.',
  autoReplace: 'Official assets are never replaced automatically. Choose a replacement yourself from the approved library.',
  replaceFromApprovedLibrary: 'This asset cannot be replaced here.',
  replaceWithGeneratedImage: 'Approved asset required. An AI-generated image can never stand in for an official asset.',
};

export interface PolicyCheckContext {
  readonly cropMode?: CropMode;
  readonly opacity?: number;
}

export function isOperationAllowed(asset: OfficialAsset, operation: AssetOperation): boolean {
  return policyFor(asset)[operation];
}

/**
 * The single gate every mutation of an asset-backed element must pass through.
 * `domain/poster/operations.ts` calls this; the editor UI additionally uses it
 * to decide which controls to render at all.
 */
export function checkOperation(
  asset: OfficialAsset,
  operation: AssetOperation,
  context: PolicyCheckContext = {},
): Result<true, string> {
  if (!asset.approved) {
    return err('Approved asset required. This image has not been approved by the association yet.');
  }
  if (!policyFor(asset)[operation]) {
    return err(DENIAL_REASON[operation]);
  }

  if (operation === 'crop' && context.cropMode && !APPROVED_CROP_MODES.includes(context.cropMode)) {
    return err(DENIAL_REASON.crop);
  }

  if (operation === 'opacity' && isProtected(asset)) {
    const opacity = context.opacity ?? 1;
    if (opacity < PROTECTED_MIN_OPACITY) {
      return err(
        `Official assets must stay at least ${Math.round(PROTECTED_MIN_OPACITY * 100)}% opaque so they remain clearly recognisable.`,
      );
    }
  }

  return ok(true);
}

export interface PolicySummaryRow {
  readonly label: string;
  readonly allowed: boolean;
  readonly note?: string;
}

/** Drives the "OFFICIAL ASSET" panel in the editor. */
export function policySummary(asset: OfficialAsset): readonly PolicySummaryRow[] {
  const policy = policyFor(asset);
  return [
    { label: 'Position', allowed: policy.position },
    {
      label: 'Scale (proportions locked)',
      allowed: policy.uniformScale,
      note: policy.nonUniformScale ? undefined : 'Aspect ratio is always preserved',
    },
    {
      label: 'Replace',
      allowed: policy.replaceFromApprovedLibrary,
      note: 'Only from the approved asset library',
    },
    { label: 'Approved crop / frame', allowed: policy.crop },
    { label: 'Stretch or distort', allowed: policy.nonUniformScale },
    { label: 'Recolour', allowed: policy.recolor },
    { label: 'Mirror / flip', allowed: policy.flipHorizontal },
    { label: 'Stylise or filter', allowed: policy.stylize },
    { label: 'AI regenerate', allowed: policy.aiRegenerate },
    { label: 'AI enhance', allowed: policy.aiEnhance },
  ];
}
