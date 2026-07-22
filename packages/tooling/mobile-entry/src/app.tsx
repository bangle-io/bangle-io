import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type {
  ShouldStartLoadRequest,
  WebViewErrorEvent,
} from 'react-native-webview/lib/WebViewTypes';
import { getWebViewNavigationAction } from './webview-navigation';

const FALLBACK_WEB_URL = 'https://app.bangle.io';

function resolveWebUrl(): string {
  const extra = Constants.expoConfig?.extra;
  const fromConfig =
    extra && typeof extra['bangleWebUrl'] === 'string'
      ? extra['bangleWebUrl']
      : undefined;
  return fromConfig ?? FALLBACK_WEB_URL;
}

/**
 * Thin shell around the Bangle.io web app. Everything user-facing lives in
 * the web bundle; this component only owns the WebView lifecycle, external
 * link handling, and a load-failure recovery screen.
 */
export function App() {
  const webUrl = useMemo(resolveWebUrl, []);
  const webViewRef = useRef<WebView<object>>(null);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);

  const handleShouldStartLoad = useCallback(
    (request: ShouldStartLoadRequest): boolean => {
      const action = getWebViewNavigationAction(request.url, webUrl);
      if (action === 'allow') {
        return true;
      }
      if (action === 'reject') {
        return false;
      }
      // External links leave the shell and open in the system browser so
      // the WebView never navigates away from the app origin.
      void Linking.openURL(request.url);
      return false;
    },
    [webUrl],
  );

  const handleError = useCallback((event: WebViewErrorEvent) => {
    setLoadError(event.nativeEvent.description || 'Failed to load');
  }, []);

  const handleRetry = useCallback(() => {
    setLoadError(undefined);
    webViewRef.current?.reload();
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="default" />
      {loadError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Could not load Bangle</Text>
          <Text style={styles.errorDetail}>{loadError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={handleRetry}
            style={styles.retryButton}
          >
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        // The type parameter works around WebView<P = undefined> in the
        // shipped types: `WebViewProps & undefined` collapses to `never`.
        <WebView<object>
          ref={webViewRef}
          source={{ uri: webUrl }}
          style={styles.webView}
          originWhitelist={['https://*', 'http://*']}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onError={handleError}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
            </View>
          )}
          allowsBackForwardNavigationGestures
          keyboardDisplayRequiresUserAction={false}
          allowsInlineMediaPlayback
          bounces={false}
          setSupportMultipleWindows={false}
          webviewDebuggingEnabled={__DEV__}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  errorDetail: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1f2937',
  },
  retryLabel: {
    color: '#ffffff',
    fontSize: 16,
  },
});
