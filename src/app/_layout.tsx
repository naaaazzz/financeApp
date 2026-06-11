import React, { useEffect } from 'react';
import { View, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DATABASE_NAME, initializeDatabase } from '../database/db';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { TrackerProvider } from '../context/TrackerContext';
import { ToastProvider } from '../context/ToastContext';

// Navigation gate based on offline authentication status
function RootNavigationGate() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    // Check if current route is within the authentication group (auth)
    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // If user is not authenticated and not in auth screens, redirect to login
      router.replace('/(auth)/login');
    } else if (user && (inAuthGroup || segments.length === 0 || segments[0] === 'index' || segments[0] === 'explore')) {
      // If user is logged in and in auth group or default root files, redirect to main tabs
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0C16', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#0A0C16' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0C16" />
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeDatabase}>
        <AuthProvider>
          <TrackerProvider>
            <ToastProvider>
              <RootNavigationGate />
            </ToastProvider>
          </TrackerProvider>
        </AuthProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
