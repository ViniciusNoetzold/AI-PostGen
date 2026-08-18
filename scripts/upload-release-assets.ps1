$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $ScriptDir "..")
$Root = Get-Location

# Obter token do git credential manager
$credOutput = "protocol=https`nhost=github.com`n`n" | git credential fill
$token = ""
foreach ($line in ($credOutput -split "`n")) {
    if ($line.StartsWith("password=")) {
        $token = $line.Substring(9).Trim()
        break
    }
}

$repo = "ViniciusNoetzold/AI-PostGen"
$tag = "v1.0.0"

$headers = @{
    "Authorization" = "Bearer $token"
    "Accept"        = "application/vnd.github+json"
    "User-Agent"    = "AI-PostGen-Release-Agent"
}

$getUrl = "https://api.github.com/repos/$repo/releases/tags/$tag"
$release = Invoke-RestMethod -Uri $getUrl -Method Get -Headers $headers
$releaseId = $release.id

Write-Host "ID da Release: $releaseId" -ForegroundColor Cyan

$assets = @(
    @{ Name = "AI-PostGen-Portable.exe"; Path = (Join-Path $Root "release\AI-PostGen-Portable.exe"); ContentType = "application/octet-stream" },
    @{ Name = "AI-PostGen-Setup.exe"; Path = (Join-Path $Root "release\AI-PostGen-Setup.exe"); ContentType = "application/octet-stream" },
    @{ Name = "AI-PostGen-Portable-v1.0.0-windows-x64.zip"; Path = (Join-Path $Root "release\AI-PostGen-Portable-v1.0.0-windows-x64.zip"); ContentType = "application/zip" }
)

foreach ($asset in $assets) {
    Write-Host "Enviando $($asset.Name)..." -ForegroundColor Yellow
    $uploadUrl = "https://uploads.github.com/repos/$repo/releases/$releaseId/assets?name=$($asset.Name)"
    $filePath = $asset.Path

    & curl.exe -s -S -X POST `
        -H "Authorization: Bearer $token" `
        -H "Content-Type: $($asset.ContentType)" `
        --data-binary "@$filePath" `
        "$uploadUrl" | Out-Null

    Write-Host "  OK: $($asset.Name) enviado!" -ForegroundColor Green
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " TODOS OS ASSETS PUBLICADOS NA RELEASE!" -ForegroundColor Green
Write-Host " URL: $($release.html_url)" -ForegroundColor White
Write-Host "=========================================" -ForegroundColor Cyan
