import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import screens
import HomeScreen from './screens/HomeScreen';
import AddSubscriptionScreen from './screens/AddSubscriptionScreen';
import EditSubscriptionScreen from './screens/EditSubscriptionScreen';
import SettingsScreen from './screens/SettingsScreen';

// Add debugging if needed
import DebugInfo from './components/debug-info';

// Create navigator
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'Subscription Calendar' }} 
          />
          <Stack.Screen 
            name="AddSubscription" 
            component={AddSubscriptionScreen} 
            options={{ title: 'Add Subscription' }} 
          />
          <Stack.Screen 
            name="EditSubscription" 
            component={EditSubscriptionScreen} 
            options={{ title: 'Edit Subscription' }} 
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen} 
            options={{ title: 'Settings' }} 
          />
        </Stack.Navigator>
      </NavigationContainer>
      
      {/* Add debug info component that works similar to web version */}
      <DebugInfo />
    </>
  );
}
