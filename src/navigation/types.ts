import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/**
 * The poster-making flow, in order:
 * Home → Office → Event type → Template → Event details → Editor → Check →
 * Preview → Export.
 */
export type RootStackParamList = {
  Home: undefined;
  OfficeSelect: undefined;
  EventTypeSelect: { officeId: string };
  TemplateSelect: { officeId: string; eventTypeId: string };
  EventDetails: { officeId: string; eventTypeId: string; templateId: string; posterId?: string };
  Editor: { posterId: string };
  AssetPicker: { elementId: string; officeId: string };
  AssetLibrary: { officeId?: string };
  TemplateLibrary: { officeId?: string };
  PosterCheck: { posterId: string };
  Preview: { posterId: string };
  Export: { posterId: string };
};

export type ScreenProps<Route extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  Route
>;
