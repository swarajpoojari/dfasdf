export interface CommitteeMember {
  readonly name: string;
  readonly designation: string;
  readonly phone?: string;
}

export interface OfficeContact {
  readonly phone?: string;
  readonly email?: string;
  readonly website?: string;
}

/**
 * A local office is pure configuration. No screen hard-codes an office name,
 * address or logo — adding "Thane Local Office" is a single entry in
 * `domain/offices/offices.ts` plus its approved assets.
 */
export interface LocalOffice {
  readonly id: string;
  readonly name: string;
  /** Short form used where space is tight (template cards, chips). */
  readonly shortName: string;
  readonly nameLocal?: string;
  readonly address: string;
  readonly contact: OfficeContact;
  /** Asset ids this office is allowed to use, beyond the association-wide ones. */
  readonly approvedAssetIds: readonly string[];
  /** Template ids offered to this office; empty means "all official templates". */
  readonly templateIds: readonly string[];
  readonly committee: readonly CommitteeMember[];
  readonly defaultFooter: string;
  /** Accent colour used only in the APP UI, never applied to a protected asset. */
  readonly accentColor: string;
  readonly active: boolean;
}
