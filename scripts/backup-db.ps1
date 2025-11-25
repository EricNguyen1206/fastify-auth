# Database Backup Script
# Creates timestamped backup of SQLite database

param(
    [string]$BackupDir = "prisma/backups",
    [switch]$Compress
)

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dbPath = "prisma/data/app.db"
$backupPath = "$BackupDir/app-$timestamp.db"

# Ensure backup directory exists
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# Check if database exists
if (-not (Test-Path $dbPath)) {
    Write-Host "❌ Database not found at: $dbPath" -ForegroundColor Red
    exit 1
}

# Create backup
Write-Host "📦 Creating backup..." -ForegroundColor Cyan
Copy-Item -Path $dbPath -Destination $backupPath -Force

if ($Compress) {
    Write-Host "🗜️  Compressing backup..." -ForegroundColor Cyan
    Compress-Archive -Path $backupPath -DestinationPath "$backupPath.zip" -Force
    Remove-Item $backupPath
    $backupPath = "$backupPath.zip"
}

$size = (Get-Item $backupPath).Length / 1KB
Write-Host "✅ Backup created: $backupPath ($([math]::Round($size, 2)) KB)" -ForegroundColor Green

# Keep only last 10 backups
$backups = Get-ChildItem -Path $BackupDir -Filter "app-*.db*" | Sort-Object LastWriteTime -Descending
if ($backups.Count -gt 10) {
    Write-Host "🧹 Cleaning old backups (keeping last 10)..." -ForegroundColor Yellow
    $backups | Select-Object -Skip 10 | Remove-Item -Force
}

Write-Host "`n📊 Backup Summary:" -ForegroundColor Cyan
Write-Host "   Location: $backupPath"
Write-Host "   Size: $([math]::Round($size, 2)) KB"
Write-Host "   Total backups: $($backups.Count)"
