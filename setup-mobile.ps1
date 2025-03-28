# PowerShell script to set up the mobile app with shared code

# Create the Expo project
Write-Host "Creating new Expo React Native project..." -ForegroundColor Green
npx create-expo-app mobile --template expo-template-blank-typescript

# Install required dependencies for the mobile app
Write-Host "Installing dependencies for mobile app..." -ForegroundColor Green
Set-Location -Path .\mobile
npm install @react-navigation/native @react-navigation/native-stack @react-native-async-storage/async-storage expo-localization
npx expo install react-native-screens react-native-safe-area-context

# Set up yarn link for shared code
Write-Host "Setting up shared code linkage..." -ForegroundColor Green
Set-Location -Path ..\shared
yarn install
yarn link

Set-Location -Path ..\mobile
yarn link "@subscription-calendar/shared"

Write-Host "Setup complete! You can now run the mobile app with 'cd mobile && npx expo start'" -ForegroundColor Cyan
Write-Host "Press any key to exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
