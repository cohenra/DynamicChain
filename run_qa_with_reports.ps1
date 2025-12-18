Write-Host '🚀 Starting WMS Automation Suite...' -ForegroundColor Green

# 0. Pre-Flight Check
Write-Host '⚠️  IMPORTANT: Make sure "docker-compose up" is running in another terminal!' -ForegroundColor Yellow
Write-Host '   Open http://localhost:5173 in your browser. If it does not load, the tests will fail.' -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 1. Reset Database
Write-Host '🧹 Resetting Database...' -ForegroundColor Yellow
docker-compose exec -T api python seed_data.py --reset
if ($LASTEXITCODE -ne 0) { 
    Write-Error '❌ Database Reset Failed! Is Docker running?'
    exit 1 
}

# 2. Backend Tests (Fixed Command)
Write-Host '🧠 Installing Dependencies & Running Backend Tests...' -ForegroundColor Cyan
docker-compose exec -T api pip install httpx pytest-asyncio pytest-html
# השינוי הגדול: שימוש ב-python -m pytest פותר את בעיית ה-Path
docker-compose exec -T api python -m pytest tests/test_critical_flows.py --html=report_backend.html --self-contained-html
$backendExitCode = $LASTEXITCODE

# 3. Frontend Tests
Write-Host '🖥️ Running Frontend Tests...' -ForegroundColor Cyan
Push-Location apps/web

# התקנת תלויות (כולל תיקון גרסאות)
cmd /c "npm install --legacy-peer-deps"
# הרצת בדיקות (Playwright)
cmd /c "npx playwright test tests/wms-ui.spec.ts --project=chromium --reporter=html"
$frontendExitCode = $LASTEXITCODE
Pop-Location

# 4. Summary
Write-Host '----------------------------------------'
if ($backendExitCode -eq 0 -and $frontendExitCode -eq 0) {
    Write-Host '✅✅ ALL TESTS PASSED! System is Stable.' -ForegroundColor Green
} else {
    Write-Host '❌❌ TESTS FAILED!' -ForegroundColor Red
    if ($backendExitCode -ne 0) { Write-Host '   -> Backend Tests Failed' -ForegroundColor Red }
    if ($frontendExitCode -ne 0) { Write-Host '   -> Frontend Tests Failed (Check if localhost:5173 is accessible)' -ForegroundColor Red }
}

Write-Host '📊 Report Locations:' -ForegroundColor Yellow
Write-Host '1. Backend: apps/api/report_backend.html'
Write-Host '2. Frontend: apps/web/playwright-report/index.html'