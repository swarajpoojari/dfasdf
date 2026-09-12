import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from '@/navigation/RootNavigator';
import { useLibraryStore } from '@/state/libraryStore';

export default function App() {
  const bootstrap = useLibraryStore((state) => state.bootstrap);
  const ready = useLibraryStore((state) => state.ready);

  // The official asset library is loaded before anything can be edited, so a
  // poster never renders against a half-populated registry.
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {ready ? <RootNavigator /> : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
