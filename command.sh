#!/bin/bash
# Utility script for troubleshooting Next.js application

echo "=== Subscription Calendar Troubleshooter ==="
echo ""

# Function to check if a directory exists
check_dir() {
  if [ -d "$1" ]; then
    echo "✓ $2 directory found"
  else
    echo "✗ $2 directory not found - creating it"
    mkdir -p "$1"
  fi
}

# Function to check if a file exists
check_file() {
  if [ -f "$1" ]; then
    echo "✓ $2 file found"
  else
    echo "✗ $2 file not found"
  fi
}

# Check directory structure
check_dir "./components" "Components"
check_dir "./app" "App"
check_dir "./public" "Public"

# Check critical files
check_file "./components/subscription-calendar.tsx" "SubscriptionCalendar component"
check_file "./components/debug-info.tsx" "Debug Info component"
check_file "./app/page.tsx" "Main page"
check_file "./app/layout.tsx" "Layout"
check_file "./app/error.tsx" "Error component"
check_file "./app/loading.tsx" "Loading component"
check_file "./next.config.js" "Next config"
check_file "./tsconfig.json" "TypeScript config"
check_file "./next-env.d.ts" "Next env declaration"

echo ""
echo "=== Attempting to fix common issues ==="

# Delete Next.js cache
if [ -d "./.next" ]; then
  echo "Removing .next directory to clear cache"
  rm -rf ./.next
fi

# Create components directory if missing
if [ ! -d "./components" ]; then
  echo "Creating components directory"
  mkdir -p ./components
fi

echo ""
echo "=== Environment Information ==="
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Shell: $SHELL"

echo ""
echo "=== Setup instructions ==="
echo "1. Make sure all components are properly placed in the components directory"
echo "2. Run 'npm install' or 'yarn install' to install dependencies"
echo "3. Run 'npm run dev' or 'yarn dev' to start the development server"
echo ""
echo "If you continue to have issues, check the browser console for errors."

# Offer to run npm commands automatically
echo ""
read -p "Would you like to run 'npm install' now? (y/n) " run_npm_install
if [ "$run_npm_install" = "y" ]; then
  echo "Running npm install..."
  npm install
fi

read -p "Would you like to run 'npm run dev' now? (y/n) " run_npm_dev
if [ "$run_npm_dev" = "y" ]; then
  echo "Starting development server..."
  npm run dev
fi
