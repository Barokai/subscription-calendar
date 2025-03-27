import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from '@subscription-calendar/shared';

// Debug info specifically for React Native
const DebugInfo = () => {
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Function to collect debug information
  const collectDebugInfo = async () => {
    const windowWidth = Dimensions.get('window').width;
    const windowHeight = Dimensions.get('window').height;

    // Get AsyncStorage keys
    let storageData: Record<string, string | null> = {};
    try {
      const keys = await AsyncStorage.getAllKeys();
      for (const key of keys) {
        storageData[key] = await AsyncStorage.getItem(key);
      }
    } catch (error) {
      storageData['error'] = `Unable to access AsyncStorage: ${error}`;
    }

    return {
      deviceInfo: {
        dimensions: `${windowWidth}x${windowHeight}`,
        platform: Platform.name,
        osVersion: Platform.Version,
        brand: Platform.OS,
      },
      storage: storageData,
      environment: __DEV__ ? 'development' : 'production',
    };
  };

  useEffect(() => {
    // Check if we should show debug info (development mode)
    if (__DEV__) {
      setIsDebugMode(true);
      collectDebugInfo().then(info => setDebugInfo(info));
    }

    // Add gesture or key handler for toggling in production
    // For example, using a shake gesture or dev menu
  }, []);

  // Helper function to format values for display
  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') return '[Object]';
    return String(value);
  };

  if (!isDebugMode || !debugInfo) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Debug Info:</Text>
        <TouchableOpacity 
          style={styles.hideButton} 
          onPress={() => setIsDebugMode(false)}
        >
          <Text style={styles.hideButtonText}>Hide</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.infoItem}>
          Window: {debugInfo.deviceInfo.dimensions}
        </Text>
        <Text style={styles.infoItem}>
          Environment: {debugInfo.environment}
        </Text>
        <Text style={styles.infoItem}>
          Platform: {debugInfo.deviceInfo.platform} ({debugInfo.deviceInfo.brand})
        </Text>

        <Text style={styles.sectionTitle}>Storage:</Text>
        {Object.entries(debugInfo.storage).slice(0, 5).map(([key, value]) => (
          <Text key={`storage-${key}`} style={styles.infoItem}>
            {key.length > 15 ? key.substring(0, 15) + '...' : key}: {formatValue(value)}
          </Text>
        ))}
        {Object.keys(debugInfo.storage).length > 5 && (
          <Text style={styles.moreItemsText}>
            + {Object.keys(debugInfo.storage).length - 5} more items
          </Text>
        )}

        <Text style={styles.reactWorkingText}>React Native is working!</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    maxWidth: 280,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 12,
    zIndex: 9999,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  hideButton: {
    backgroundColor: '#444',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  hideButtonText: {
    color: '#ddd',
    fontSize: 12,
  },
  content: {
    maxHeight: 200,
  },
  infoItem: {
    color: 'white',
    fontSize: 12,
    marginBottom: 4,
  },
  sectionTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  moreItemsText: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  reactWorkingText: {
    color: '#4ade80', // green-400 equivalent
    marginTop: 8,
    fontSize: 12,
  },
});

export default DebugInfo;
