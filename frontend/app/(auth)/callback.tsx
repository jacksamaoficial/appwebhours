import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing } from '../../src/utils/colors';
import { useAuthStore } from '../../src/store/authStore';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { loginWithGoogle } = useAuthStore();

  useEffect(() => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const handleCallback = async () => {
      try {
        // Get session_id from URL hash (web only)
        if (typeof window !== 'undefined') {
          const hash = window.location.hash;
          const sessionIdMatch = hash.match(/session_id=([^&]+)/);
          
          if (sessionIdMatch) {
            const sessionId = sessionIdMatch[1];
            await loginWithGoogle(sessionId);
            // Auth store will trigger navigation via useProtectedRoute
          } else {
            router.replace('/(auth)/login');
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        router.replace('/(auth)/login');
      }
    };

    handleCallback();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>Autenticando...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  text: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 16,
  },
});
