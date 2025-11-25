# K6 Performance Testing - Run All Tests
# This script runs all performance test combinations and generates a comparison report

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "K6 Performance Testing Suite" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$resultsDir = "src/tests/k6/results"

# Ensure results directory exists
if (-not (Test-Path $resultsDir)) {
    New-Item -ItemType Directory -Path $resultsDir -Force | Out-Null
}

# Function to run a performance test
function Run-PerfTest {
    param(
        [string]$Runtime,
        [string]$Scenario,
        [string]$Command
    )
    
    Write-Host "`n📊 Running $Scenario test with $Runtime..." -ForegroundColor Yellow
    Write-Host "Command: $Command" -ForegroundColor Gray
    
    $outputFile = "$resultsDir/$Scenario-$Runtime-$timestamp.json"
    
    try {
        # Execute the command
        Invoke-Expression $Command
        
        Write-Host "✅ $Runtime $Scenario test completed" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ $Runtime $Scenario test failed: $_" -ForegroundColor Red
    }
    
    # Wait a bit between tests
    Write-Host "⏳ Cooling down for 10 seconds..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
}

# Prompt user for which tests to run
Write-Host "Select test configuration:" -ForegroundColor Cyan
Write-Host "1. Load tests only (faster, ~15 minutes)" -ForegroundColor White
Write-Host "2. Stress tests only (longer, ~30 minutes)" -ForegroundColor White
Write-Host "3. All tests (comprehensive, ~45 minutes)" -ForegroundColor White
Write-Host ""
$choice = Read-Host "Enter choice (1-3)"

$runLoad = $false
$runStress = $false

switch ($choice) {
    "1" { $runLoad = $true }
    "2" { $runStress = $true }
    "3" { $runLoad = $true; $runStress = $true }
    default { 
        Write-Host "Invalid choice. Exiting." -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n🔍 Checking prerequisites..." -ForegroundColor Cyan

# Check if K6 is installed
try {
    $k6Version = k6 version
    Write-Host "✅ K6 is installed: $k6Version" -ForegroundColor Green
}
catch {
    Write-Host "❌ K6 is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   winget install k6" -ForegroundColor Yellow
    exit 1
}

# Check if PM2 is installed
try {
    $pm2Version = pm2 --version
    Write-Host "✅ PM2 is installed: $pm2Version" -ForegroundColor Green
}
catch {
    Write-Host "❌ PM2 is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g pm2" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n🚀 Starting performance tests..." -ForegroundColor Cyan
Write-Host "Results will be saved to: $resultsDir" -ForegroundColor Gray

# Run Load Tests
if ($runLoad) {
    Write-Host "`n======= LOAD TESTS (5 minutes each) =======" -ForegroundColor Magenta
    
    # pnpm load test (if pnpm is installed)
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        Run-PerfTest -Runtime "pnpm" -Scenario "load-test" -Command "npm run perf:load:pnpm"
    } else {
        Write-Host "⚠️  Skipping pnpm load test (pnpm not installed)" -ForegroundColor Yellow
    }
    
    # pm2 load test
    Run-PerfTest -Runtime "pm2" -Scenario "load-test" -Command "npm run perf:load:pm2"
}

# Run Stress Tests
if ($runStress) {
    Write-Host "`n======= STRESS TESTS (10 minutes each) =======" -ForegroundColor Magenta
    
    # pnpm stress test (if pnpm is installed)
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        Run-PerfTest -Runtime "pnpm" -Scenario "stress-test" -Command "npm run perf:stress:pnpm"
    } else {
        Write-Host "⚠️  Skipping pnpm stress test (pnpm not installed)" -ForegroundColor Yellow
    }
    
    # pm2 stress test
    Run-PerfTest -Runtime "pm2" -Scenario "stress-test" -Command "npm run perf:stress:pm2"
}

# Cleanup any remaining processes
Write-Host "`n🧹 Cleaning up..." -ForegroundColor Cyan
pm2 delete all 2>$null
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "✅ All tests completed!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "`n📁 Results saved to: $resultsDir" -ForegroundColor Yellow
Write-Host "`n📊 To analyze results:" -ForegroundColor Cyan
Write-Host "   1. Open K6 Cloud (cloud.k6.io) to visualize if you ran with --out cloud" -ForegroundColor White
Write-Host "   2. Review console output above for summary metrics" -ForegroundColor White
Write-Host "   3. Compare results across npm/pnpm/pm2 configurations" -ForegroundColor White
Write-Host ""
