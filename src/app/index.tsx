import { Redirect } from 'expo-router';

export default function Index() {
  // Immediately redirect to auth flow; RootNavigationGate in _layout.tsx
  // handles final routing based on authentication state.
  return <Redirect href="/(auth)/login" />;
}
