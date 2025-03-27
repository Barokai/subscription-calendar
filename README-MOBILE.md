# React Native Integration Guide

This document explains how to create a React Native version of the Subscription Calendar app using the shared business logic.

## Getting Started

### 1. Set Up a New React Native Project

```bash
# Make sure you have the React Native CLI installed
npm install -g react-native-cli

# Create a new React Native project
npx react-native init SubscriptionCalendarMobile --template react-native-template-typescript

# Navigate to the project directory
cd SubscriptionCalendarMobile
```

### 2. Copy Shared Logic

Copy the `shared` directory from this project to your React Native project:

```bash
cp -r ../subscription-calendar/shared ./src/
```

### 3. Install Required Dependencies

```bash
# Install AsyncStorage
npm install @react-native-async-storage/async-storage

# Add date utilities (optional but helpful)
npm install date-fns
```

### 4. Create React Native Screens

Create React Native screens that correspond to the web app pages:

- `src/screens/HomeScreen.tsx` - Main calendar view
- `src/screens/AddSubscriptionScreen.tsx` - Form to add a new subscription
- `src/screens/EditSubscriptionScreen.tsx` - Form to edit an existing subscription
- `src/screens/SettingsScreen.tsx` - App settings

### 5. Use the Shared Hooks and Logic

Example usage of shared hooks:

```typescript
// src/screens/HomeScreen.tsx
import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { useSubscriptions } from '../shared/hooks/useStorage';
import { groupSubscriptionsByMonth } from '../shared/subscription-logic';

export const HomeScreen = () => {
  const { subscriptions, loading, error } = useSubscriptions();
  
  if (loading) {
    return <View><Text>Loading...</Text></View>;
  }
  
  if (error) {
    return <View><Text>Error: {error.message}</Text></View>;
  }
  
  const groupedSubscriptions = groupSubscriptionsByMonth(subscriptions);
  
  // Render your calendar UI using the grouped subscriptions
  return (
    <View>
      {/* Your UI code here */}
    </View>
  );
};
```

## Considerations for Cross-Platform Development

1. **UI Components**: Create platform-specific UI components while reusing business logic
2. **Navigation**: Use React Navigation for React Native
3. **Styling**: React Native uses StyleSheet instead of CSS/Tailwind
4. **Storage**: Use AsyncStorage instead of localStorage (handled by our adapters)
5. **Debug Mode**: Create a React Native version of the debug panel
6. **Notifications**: Implement platform-specific notification code

## Debugging

For React Native debugging, use Flipper (https://fbflipper.com/) or the React Native Debugger.

## Shared Testing

Consider writing shared tests for your business logic that can run in both environments.
