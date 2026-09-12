import type { LocalOffice } from '@/domain/types/office';
import { officeLogoSlotId } from '@/domain/assets/slots';

/**
 * Local office configuration.
 *
 * Addresses and phone numbers below are placeholders marked `TO BE CONFIRMED`.
 * They are deliberately not invented: an office address printed on a community
 * poster has to be the real one. The admin panel (docs/BACKEND.md) publishes the
 * authoritative values, and this file is the offline fallback until it does.
 */
export const LOCAL_OFFICES: readonly LocalOffice[] = [
  {
    id: 'navi-mumbai',
    name: 'Navi Mumbai Local Office',
    shortName: 'Navi Mumbai',
    address: 'TO BE CONFIRMED — Navi Mumbai Local Office address',
    contact: {},
    approvedAssetIds: [officeLogoSlotId('navi-mumbai')],
    templateIds: [],
    committee: [],
    defaultFooter: 'Billawar Association Mumbai — Navi Mumbai Local Office',
    accentColor: '#1F6F6B',
    active: true,
  },
  {
    id: 'dahisar',
    name: 'Dahisar Local Office',
    shortName: 'Dahisar',
    address: 'TO BE CONFIRMED — Dahisar Local Office address',
    contact: {},
    approvedAssetIds: [officeLogoSlotId('dahisar')],
    templateIds: [],
    committee: [],
    defaultFooter: 'Billawar Association Mumbai — Dahisar Local Office',
    accentColor: '#8A5A2B',
    active: true,
  },
  {
    id: 'dombivli',
    name: 'Dombivli Local Office',
    shortName: 'Dombivli',
    address: 'TO BE CONFIRMED — Dombivli Local Office address',
    contact: {},
    approvedAssetIds: [officeLogoSlotId('dombivli')],
    templateIds: [],
    committee: [],
    defaultFooter: 'Billawar Association Mumbai — Dombivli Local Office',
    accentColor: '#4A5D9E',
    active: true,
  },
  {
    id: 'chembur',
    name: 'Chembur Local Office',
    shortName: 'Chembur',
    address: 'TO BE CONFIRMED — Chembur Local Office address',
    contact: {},
    approvedAssetIds: [officeLogoSlotId('chembur')],
    templateIds: [],
    committee: [],
    defaultFooter: 'Billawar Association Mumbai — Chembur Local Office',
    accentColor: '#9E3B4A',
    active: true,
  },
  {
    id: 'vikhroli',
    name: 'Vikhroli Local Office',
    shortName: 'Vikhroli',
    address: 'TO BE CONFIRMED — Vikhroli Local Office address',
    contact: {},
    approvedAssetIds: [officeLogoSlotId('vikhroli')],
    templateIds: [],
    committee: [],
    defaultFooter: 'Billawar Association Mumbai — Vikhroli Local Office',
    accentColor: '#3C7A4B',
    active: true,
  },
  {
    id: 'kalyan',
    name: 'Kalyan Local Office',
    shortName: 'Kalyan',
    address: 'TO BE CONFIRMED — Kalyan Local Office address',
    contact: {},
    approvedAssetIds: [officeLogoSlotId('kalyan')],
    templateIds: [],
    committee: [],
    defaultFooter: 'Billawar Association Mumbai — Kalyan Local Office',
    accentColor: '#7A5AA8',
    active: true,
  },
];

export const ASSOCIATION_NAME = 'Billawar Association Mumbai';
export const ASSOCIATION_NAME_LOCAL = 'बिल्लवर असोसिएशन मुंबई';

export function findOffice(id: string): LocalOffice | undefined {
  return LOCAL_OFFICES.find((office) => office.id === id);
}

export function activeOffices(): readonly LocalOffice[] {
  return LOCAL_OFFICES.filter((office) => office.active);
}

/** True when an office record still carries placeholder configuration. */
export function officeNeedsConfiguration(office: LocalOffice): boolean {
  return office.address.startsWith('TO BE CONFIRMED');
}
