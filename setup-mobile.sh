#!/bin/bash
# Script to set up the mobile app with shared code

# Create the Expo project
echo "Creating new Expo React Native project..."
npx create-expo-app mobile --template expo-template-blank-typescript

# Install required dependencies for the mobile app
echo "Installing dependencies for mobile app..."
cd mobile
npm install @react-navigation/native @react-navigation/native-stack @react-native-async-storage/async-storage expo-localization
npx expo install react-native-screens react-native-safe-area-context

# Set up yarn link for shared code
echo "Setting up shared code linkage..."
cd ../shared
yarn install
yarn link

cd ../mobile
yarn link "@subscription-calendar/shared"

echo "Setup complete! You can now run the mobile app with 'cd mobile && npx expo start'"
