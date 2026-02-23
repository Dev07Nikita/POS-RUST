# ============================================================
# start-mpesa-tunnel.ps1
# 
# One-click setup for M-Pesa development:
#   1. Downloads ngrok if not installed
#   2. Starts ngrok tunnel on port 8080
#   3. Reads the public HTTPS URL from the ngrok API
#   4. Patches application.properties with the real URLs
#   5. Restarts Spring Boot so credentials take effect
#
# Usage:
#   cd 'E:\POS RUST'
#   .\start-mpesa-tunnel.ps1 -ConsumerKey YOUR_KEY -ConsumerSecret YOUR_SECRET -Passkey YOUR_PASSKEY
#
# Get credentials from: https://developer.safaricom.co.ke/MyApps
# ============================================================

param(
    [string]$ConsumerKey    = $env:MPESA_CONSUMER_KEY,
    [string]$ConsumerSecret = $env:MPESA_CONSUMER_SECRET,
    [string]$Passkey        = $env:MPESA_PASSKEY,
    [string]$Shortcode      = "600991",
    [string]$NgrokAuthToken = $env:NGROK_AUTHTOKEN   # optional, needed for stable URLs
)

$ErrorActionPreference = "Stop"
$PropertiesFile = "$PSScriptRoot\pos-backend\src\main\resources\application.properties"
$NgrokExe       = "$env:LOCALAPPDATA\ngrok\ngrok.exe"
$NgrokApiUrl    = "http://localhost:4040/api/tunnels"

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Safi POS — M-Pesa Tunnel Setup" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Validate credentials ─────────────────────────────
if (-not $ConsumerKey -or $ConsumerKey -eq "your_sandbox_consumer_key") {
    Write-Host "ERROR: M-Pesa Consumer Key not provided." -ForegroundColor Red
    Write-Host ""
    Write-Host "Run the script with your credentials:" -ForegroundColor Yellow
    Write-Host "  .\start-mpesa-tunnel.ps1 -ConsumerKey ABC123 -ConsumerSecret XYZ456 -Passkey PASSKEY789" -ForegroundColor White
    Write-Host ""
    Write-Host "Get them from: https://developer.safaricom.co.ke/MyApps" -ForegroundColor Cyan
    exit 1
}

Write-Host "[1/5] Credentials provided ✓" -ForegroundColor Green

# ── Step 2: Install ngrok if missing ─────────────────────────
if (-not (Test-Path $NgrokExe)) {
    Write-Host "[2/5] ngrok not found — downloading..." -ForegroundColor Yellow
    $NgrokZip = "$env:TEMP\ngrok.zip"
    $NgrokDir = "$env:LOCALAPPDATA\ngrok"
    
    Invoke-WebRequest -Uri "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip" `
                      -OutFile $NgrokZip -UseBasicParsing
    
    New-Item -ItemType Directory -Force -Path $NgrokDir | Out-Null
    Expand-Archive -Path $NgrokZip -DestinationPath $NgrokDir -Force
    Remove-Item $NgrokZip

    # Add to session PATH
    $env:PATH = "$NgrokDir;$env:PATH"
    Write-Host "  ngrok downloaded to $NgrokDir" -ForegroundColor Gray
} else {
    $env:PATH = "$env:LOCALAPPDATA\ngrok;$env:PATH"
}

Write-Host "[2/5] ngrok ready ✓" -ForegroundColor Green

# ── Step 3: Configure ngrok auth token (optional but recommended) ──
if ($NgrokAuthToken) {
    & $NgrokExe config add-authtoken $NgrokAuthToken 2>&1 | Out-Null
    Write-Host "[3/5] ngrok auth token configured ✓" -ForegroundColor Green
} else {
    Write-Host "[3/5] No ngrok auth token — using anonymous tunnel (8hr limit)" -ForegroundColor Yellow
    Write-Host "      Get a free token at https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor Gray
}

# ── Step 4: Kill any existing ngrok, start fresh ─────────────
Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500

Write-Host "[4/5] Starting ngrok tunnel on port 8080..." -ForegroundColor Yellow
$NgrokProcess = Start-Process -FilePath $NgrokExe `
    -ArgumentList "http", "8080", "--log=stdout" `
    -PassThru -WindowStyle Minimized

Start-Sleep -Seconds 3  # Give ngrok time to establish tunnel

# Read the public URL from ngrok's local API
$PublicUrl = $null
for ($i = 0; $i -lt 10; $i++) {
    try {
        $tunnels = Invoke-RestMethod -Uri $NgrokApiUrl -ErrorAction Stop
        $https   = $tunnels.tunnels | Where-Object { $_.proto -eq "https" }
        if ($https) {
            $PublicUrl = $https.public_url.TrimEnd('/')
            break
        }
    } catch { }
    Start-Sleep -Seconds 1
}

if (-not $PublicUrl) {
    Write-Host "ERROR: Could not read ngrok tunnel URL." -ForegroundColor Red
    Write-Host "  Make sure ngrok started successfully. Check http://localhost:4040 in your browser." -ForegroundColor Yellow
    exit 1
}

$CallbackUrl    = "$PublicUrl/api/mpesa/callback"
$ConfirmUrl     = "$PublicUrl/api/mpesa/callback/confirmation"
$ValidationUrl  = "$PublicUrl/api/mpesa/callback/validation"

Write-Host ""
Write-Host "  Public URL  : $PublicUrl" -ForegroundColor Cyan
Write-Host "  Callback    : $CallbackUrl" -ForegroundColor Cyan
Write-Host "  Confirmation: $ConfirmUrl" -ForegroundColor Cyan
Write-Host "  Validation  : $ValidationUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "[4/5] ngrok tunnel active ✓" -ForegroundColor Green

# ── Step 5: Patch application.properties ─────────────────────
Write-Host "[5/5] Patching application.properties..." -ForegroundColor Yellow

$content = @"
server.port=8080
spring.application.name=pos-backend
spring.datasource.url=jdbc:sqlite:pos.db
spring.datasource.driver-class-name=org.sqlite.JDBC
spring.jpa.database-platform=org.hibernate.community.dialect.SQLiteDialect
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false

# =============================================================
# M-Pesa Daraja API Configuration  (AUTO-GENERATED — $(Get-Date -Format 'yyyy-MM-dd HH:mm'))
# =============================================================

mpesa.environment=sandbox

# Credentials from https://developer.safaricom.co.ke/MyApps
mpesa.consumer.key=$ConsumerKey
mpesa.consumer.secret=$ConsumerSecret
mpesa.passkey=$Passkey

# Shortcodes
mpesa.shortcode=$Shortcode
mpesa.c2b.shortcode=$Shortcode

# ngrok URLs — regenerated each session
mpesa.public.url=$PublicUrl
mpesa.callback.url=$CallbackUrl
"@

Set-Content -Path $PropertiesFile -Value $content -Encoding UTF8
Write-Host "[5/5] application.properties updated ✓" -ForegroundColor Green

# ── Done ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  ✅ M-Pesa tunnel is LIVE!" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor White
Write-Host "  1. Restart Spring Boot:" -ForegroundColor Gray
Write-Host "     cd pos-backend && .\gradlew bootRun" -ForegroundColor Yellow
Write-Host ""
Write-Host "  2. Register C2B URLs (do once per ngrok session):" -ForegroundColor Gray
Write-Host "     curl http://localhost:8080/api/mpesa/register" -ForegroundColor Yellow
Write-Host ""
Write-Host "  3. ngrok dashboard: http://localhost:4040" -ForegroundColor Gray
Write-Host ""
Write-Host "  ⚠  ngrok URL changes every session unless you have a paid account." -ForegroundColor DarkYellow
Write-Host "     Re-run this script each time you restart ngrok." -ForegroundColor DarkYellow
Write-Host ""
