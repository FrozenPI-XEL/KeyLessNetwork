# Start Expo with proper environment variables
$env:EXPO_NO_TELEMETRY = "1"
$env:EXPO_OFFLINE = "1"

Write-Host "Starting Expo with disabled telemetry..." -ForegroundColor Green
npm start -- --reset-cache
