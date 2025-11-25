# Database Restore Script
# Restores database from backup

param(
    [string]$BackupFile = "",
    [string]$BackupDir = "prisma/backups"
)

$dbPath = "prisma/data/app.db"

# If no backup file specified, show list and prompt
if (-not $BackupFile) {
    Write-Host "`n📂 Available backups in $BackupDir`:" -ForegroundColor Cyan
    
    $backups = Get-ChildItem -Path $BackupDir -Filter "app-*.db*" | Sort-Object LastWriteTime -Descending
    
    if ($backups.Count -eq 0) {
        Write-Host "❌ No backups found!" -ForegroundColor Red
        exit 1
    }
    
    for ($i = 0; $i -lt $backups.Count; $i++) {
        $backup = $backups[$i]
        $size = [math]::Round($backup.Length / 1KB, 2)
        $date = $backup.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
        Write-Host "  [$($i+1)] $($backup.Name) - $size KB - $date"
    }
    
    Write-Host "`n"
    $choice = Read-Host "Select backup number to restore (or 'q' to quit)"
    
    if ($choice -eq 'q') {
        Write-Host "Cancelled." -ForegroundColor Yellow
        exit 0
    }
    
    $index = [int]$choice - 1
    if ($index -lt 0 -or $index -ge $backups.Count) {
        Write-Host "❌ Invalid selection!" -ForegroundColor Red
        exit 1
    }
    
    $BackupFile = $backups[$index].FullName
}

# Check if backup file exists
if (-not (Test-Path $BackupFile)) {
    Write-Host "❌ Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

# Create current backup before restoring
Write-Host "📦 Creating safety backup of current database..." -ForegroundColor Yellow
$safetyBackup = "prisma/backups/app-before-restore-$(Get-Date -Format 'yyyyMMdd-HHmmss').db"
Copy-Item -Path $dbPath -Destination $safetyBackup -Force
Write-Host "✅ Safety backup created: $safetyBackup" -ForegroundColor Green

# Handle compressed backups
if ($BackupFile -like "*.zip") {
    Write-Host "🗜️  Extracting compressed backup..." -ForegroundColor Cyan
    $tempDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
    Expand-Archive -Path $BackupFile -DestinationPath $tempDir -Force
    $extractedDb = Get-ChildItem -Path $tempDir -Filter "*.db" | Select-Object -First 1
    $BackupFile = $extractedDb.FullName
}

# Restore database
Write-Host "🔄 Restoring database from backup..." -ForegroundColor Cyan
Copy-Item -Path $BackupFile -Destination $dbPath -Force

# Cleanup temp files if any
if (Test-Path variable:tempDir) {
    Remove-Item -Recurse -Force $tempDir
}

Write-Host "✅ Database restored successfully!" -ForegroundColor Green
Write-Host "`n📊 Restore Summary:" -ForegroundColor Cyan
Write-Host "   From: $BackupFile"
Write-Host "   To: $dbPath"
Write-Host "   Safety backup: $safetyBackup"
