import React from 'react';
import { NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '@/features/home/HomeScreen';
import { OfficeSelectScreen } from '@/features/offices/OfficeSelectScreen';
import { EventTypeSelectScreen } from '@/features/eventTypes/EventTypeSelectScreen';
import { TemplateSelectScreen } from '@/features/templateLibrary/TemplateSelectScreen';
import { TemplateLibraryScreen } from '@/features/templateLibrary/TemplateLibraryScreen';
import { EventDetailsScreen } from '@/features/eventDetails/EventDetailsScreen';
import { EditorScreen } from '@/features/editor/EditorScreen';
import { AssetLibraryScreen } from '@/features/assetLibrary/AssetLibraryScreen';
import { AssetPickerScreen } from '@/features/assetLibrary/AssetPickerScreen';
import { PosterCheckScreen } from '@/features/preview/PosterCheckScreen';
import { PreviewScreen } from '@/features/preview/PreviewScreen';
import { ExportScreen } from '@/features/export/ExportScreen';
import type { RootStackParamList } from './types';
import { colors } from '@/theme/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme: Theme = {
  dark: false,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.ink,
    border: colors.border,
    notification: colors.accent,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="OfficeSelect" component={OfficeSelectScreen} options={{ title: 'Local office' }} />
        <Stack.Screen name="EventTypeSelect" component={EventTypeSelectScreen} options={{ title: 'Event type' }} />
        <Stack.Screen name="TemplateSelect" component={TemplateSelectScreen} options={{ title: 'Template' }} />
        <Stack.Screen name="TemplateLibrary" component={TemplateLibraryScreen} options={{ title: 'Templates' }} />
        <Stack.Screen name="EventDetails" component={EventDetailsScreen} options={{ title: 'Event details' }} />
        <Stack.Screen name="Editor" component={EditorScreen} options={{ title: 'Poster editor' }} />
        <Stack.Screen name="AssetLibrary" component={AssetLibraryScreen} options={{ title: 'Official assets' }} />
        <Stack.Screen
          name="AssetPicker"
          component={AssetPickerScreen}
          options={{ title: 'Approved images', presentation: 'modal' }}
        />
        <Stack.Screen name="PosterCheck" component={PosterCheckScreen} options={{ title: 'Poster check' }} />
        <Stack.Screen name="Preview" component={PreviewScreen} options={{ title: 'Preview' }} />
        <Stack.Screen name="Export" component={ExportScreen} options={{ title: 'Export' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
