import React, { useEffect } from 'react';
import { View, ActivityIndicator, StatusBar, Text, StyleSheet, Platform, AppState } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { DATABASE_NAME, initializeDatabase } from '../database/db';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { TrackerProvider } from '../context/TrackerContext';
import { ToastProvider } from '../context/ToastContext';

// Error boundary to prevent white-screen crashes in production APK
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0C16',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    color: '#EF4444',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  message: {
    color: '#8F9BB3',
    fontSize: 14,
    textAlign: 'center',
  },
});

// Navigation gate based on offline authentication status
function RootNavigationGate() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    // Check if current route is within the authentication group (auth)
    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!user && !inAuthGroup) {
      // If user is not authenticated and not in auth screens, redirect to login
      router.replace('/(auth)/login');
    } else if (user && !inTabsGroup) {
      // If user is logged in but not in tabs, redirect to main tabs
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
  // Navigation bar immersive hiding on Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      const configureNavigationBar = async () => {
        try {
          // Set navigation bar position to absolute so it overlays the content
          await NavigationBar.setPositionAsync('absolute');
          
          // Make the navigation bar background completely transparent to avoid black bars
          await NavigationBar.setBackgroundColorAsync('#00000000');
          
          // Set behavior to overlay-swipe (Immersive Sticky Mode)
          await NavigationBar.setBehaviorAsync('overlay-swipe');
          
          // Hide the navigation bar
          await NavigationBar.setVisibilityAsync('hidden');
        } catch (error) {
          console.warn('Android Navigation Bar layout initialization error:', error);
        }
      };

      configureNavigationBar();

      // Re-apply navigation bar visibility configurations when app comes back to focus
      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
          configureNavigationBar();
        }
      });

      return () => {
        subscription.remove();
      };
    }
  }, []);

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
