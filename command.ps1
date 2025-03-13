# PowerShell script for troubleshooting Next.js application on Windows

Write-Host "=== Subscription Calendar Troubleshooter ===" -ForegroundColor Cyan
Write-Host ""

# Function to check if a directory exists
function Check-Directory {
    param (
        [string]$Path,
        [string]$Name
    )
    
    if (Test-Path -Path $Path -PathType Container) {
        Write-Host "✓ $Name directory found" -ForegroundColor Green
    } else {
        Write-Host "✗ $Name directory not found - creating it" -ForegroundColor Red
        New-Item -Path $Path -ItemType Directory -Force | Out-Null
    }
}

# Function to check if a file exists
function Check-File {
    param (
        [string]$Path,
        [string]$Name
    )
    
    if (Test-Path -Path $Path -PathType Leaf) {
        Write-Host "✓ $Name file found" -ForegroundColor Green
    } else {
        Write-Host "✗ $Name file not found" -ForegroundColor Red
    }
}

# Check directory structure
Check-Directory -Path ".\components" -Name "Components"
Check-Directory -Path ".\app" -Name "App"
Check-Directory -Path ".\public" -Name "Public"

# Check critical files
Check-File -Path ".\components\subscription-calendar.tsx" -Name "SubscriptionCalendar component"
Check-File -Path ".\components\debug-info.tsx" -Name "Debug Info component" 
Check-File -Path ".\app\page.tsx" -Name "Main page"
Check-File -Path ".\app\layout.tsx" -Name "Layout"
Check-File -Path ".\app\error.tsx" -Name "Error component"
Check-File -Path ".\app\loading.tsx" -Name "Loading component"
Check-File -Path ".\next.config.js" -Name "Next config"
Check-File -Path ".\tsconfig.json" -Name "TypeScript config"
Check-File -Path ".\next-env.d.ts" -Name "Next env declaration"

Write-Host ""
Write-Host "=== Attempting to fix common issues ===" -ForegroundColor Cyan

# Delete Next.js cache
if (Test-Path -Path ".\.next") {
    Write-Host "Removing .next directory to clear cache" -ForegroundColor Yellow
    Remove-Item -Path ".\.next" -Recurse -Force
}

# Create components directory if missing
if (-not (Test-Path -Path ".\components")) {
    Write-Host "Creating components directory" -ForegroundColor Yellow
    New-Item -Path ".\components" -ItemType Directory | Out-Null
}

Write-Host ""
Write-Host "=== Environment Information ===" -ForegroundColor Cyan
Write-Host "Node version: $(node -v)"
Write-Host "NPM version: $(npm -v)"
Write-Host "PowerShell version: $($PSVersionTable.PSVersion)"

Write-Host ""
Write-Host "=== Setup instructions ===" -ForegroundColor Cyan
Write-Host "1. Make sure all components are properly placed in the components directory" -ForegroundColor White
Write-Host "2. Run 'npm install' to install dependencies" -ForegroundColor White
Write-Host "3. Run 'npm run dev' to start the development server" -ForegroundColor White
Write-Host ""
Write-Host "If you continue to have issues, check the browser console for errors." -ForegroundColor Yellow

# Offer to run npm commands automatically
Write-Host ""
$runNpmInstall = Read-Host "Would you like to run 'npm install' now? (y/n)"
if ($runNpmInstall -eq "y") {
    Write-Host "Running npm install..." -ForegroundColor Yellow
    npm install
}

$runNpmDev = Read-Host "Would you like to run 'npm run dev' now? (y/n)"
if ($runNpmDev -eq "y") {
    Write-Host "Starting development server..." -ForegroundColor Yellow
    npm run dev
}
