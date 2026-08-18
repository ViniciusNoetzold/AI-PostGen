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

if (-not $token) {
    Write-Error "Token do GitHub nao encontrado."
    exit 1
}

$repo = "ViniciusNoetzold/AI-PostGen"
$tag = "v1.0.0"
$releaseTitle = "AI-PostGen v1.0.0 - Desktop and Web Suite"
$releaseNotes = "AI-PostGen v1.0.0 - Plataforma Completa`n`nInclui QuotePRO Orcamentos, Web Scraping Pro, YouTube Transcriber com Fila e Playlists, e Executaveis Windows."

$headers = @{
    "Authorization" = "Bearer $token"
    "Accept"        = "application/vnd.github+json"
    "User-Agent"    = "AI-PostGen-Release-Agent"
}

Write-Host "Criando Release no GitHub ($repo)..." -ForegroundColor Yellow

$releaseBody = @{
    tag_name         = $tag
    name             = $releaseTitle
    body             = $releaseNotes
    draft            = $false
    prerelease       = $false
} | ConvertTo-Json

$createUrl = "https://api.github.com/repos/$repo/releases"
$release = $null

try {
    $release = Invoke-RestMethod -Uri $createUrl -Method Post -Headers $headers -Body $releaseBody -ContentType "application/json"
    Write-Host "Release criada com sucesso: $($release.html_url)" -ForegroundColor Green
} catch {
    Write-Host "Buscando release existente..." -ForegroundColor Yellow
    $getUrl = "https://api.github.com/repos/$repo/releases/tags/$tag"
    $release = Invoke-RestMethod -Uri $getUrl -Method Get -Headers $headers
}

$uploadUrlBase = $release.upload_url -replace '\{\?name,label\}', ''

$assets = @(
    @{ Name = "AI-PostGen-Portable.exe"; Path = (Join-Path $Root "release\AI-PostGen-Portable.exe"); ContentType = "application/octet-stream" },
    @{ Name = "AI-PostGen-Setup.exe"; Path = (Join-Path $Root "release\AI-PostGen-Setup.exe"); ContentType = "application/octet-stream" },
    @{ Name = "AI-PostGen-Portable-v1.0.0-windows-x64.zip"; Path = (Join-Path $Root "release\AI-PostGen-Portable-v1.0.0-windows-x64.zip"); ContentType = "application/zip" }
)

foreach ($asset in $assets) {
    if (-not (Test-Path $asset.Path)) {
        Write-Warning "Arquivo $($asset.Path) nao encontrado"
        continue
    }

    Write-Host "Enviando asset: $($asset.Name)..." -ForegroundColor Yellow
    $uploadUri = "$uploadUrlBase?name=$($asset.Name)"
    $fileBytes = [System.IO.File]::ReadAllBytes($asset.Path)

    try {
        $uploadHeaders = @{
            "Authorization" = "Bearer $token"
            "Content-Type"  = $asset.ContentType
            "User-Agent"    = "AI-PostGen-Release-Agent"
        }
        $resp = Invoke-RestMethod -Uri $uploadUri -Method Post -Headers $uploadHeaders -Body $fileBytes
        Write-Host "  OK: $($asset.Name) anexado com sucesso!" -ForegroundColor Green
    } catch {
        Write-Warning "Falha ao anexar $($asset.Name): $($_.Exception.Message)"
    }
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " RELEASE PUBLICADA COM SUCESSO NO GITHUB!" -ForegroundColor Green
Write-Host " URL: $($release.html_url)" -ForegroundColor White
Write-Host "=========================================" -ForegroundColor Cyan
