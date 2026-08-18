$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

$CscPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $CscPath)) {
    $CscPath = (Get-Command csc.exe -ErrorAction SilentlyContinue).Source
}

if (-not $CscPath) {
    Write-Error "C# compiler (csc.exe) not found."
    exit 1
}

$ReleaseDir = Join-Path $ScriptDir "release"
if (-not (Test-Path $ReleaseDir)) {
    New-Item -ItemType Directory -Path $ReleaseDir | Out-Null
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " GERANDO EXECUTAVEIS DO AI-POSTGEN" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Compilar Launcher Portatil (AI-PostGen-Portable.exe)
Write-Host "[1/3] Compilando Executavel Portatil (AI-PostGen-Portable.exe)..." -ForegroundColor Yellow
$LauncherSrc = Join-Path $ScriptDir "src-desktop\Launcher.cs"
$PortableOut = Join-Path $ReleaseDir "AI-PostGen-Portable.exe"
$RootPortable = Join-Path $ScriptDir "AI-PostGen-Portable.exe"

& $CscPath /target:winexe /optimize+ /platform:anycpu "/out:$PortableOut" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll "$LauncherSrc"
if ($LASTEXITCODE -eq 0) {
    Copy-Item $PortableOut $RootPortable -Force
    Write-Host "  OK: AI-PostGen-Portable.exe gerado com sucesso!" -ForegroundColor Green
} else {
    Write-Error "Falha ao compilar Launcher Portatil."
}

# 2. Compilar Instalador (AI-PostGen-Setup.exe)
Write-Host "[2/3] Compilando Instalador Windows (AI-PostGen-Setup.exe)..." -ForegroundColor Yellow
$InstallerSrc = Join-Path $ScriptDir "src-desktop\Installer.cs"
$SetupOut = Join-Path $ReleaseDir "AI-PostGen-Setup.exe"
$RootSetup = Join-Path $ScriptDir "AI-PostGen-Setup.exe"

& $CscPath /target:winexe /optimize+ /platform:anycpu "/out:$SetupOut" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:Microsoft.CSharp.dll "$InstallerSrc"
if ($LASTEXITCODE -eq 0) {
    Copy-Item $SetupOut $RootSetup -Force
    Write-Host "  OK: AI-PostGen-Setup.exe gerado com sucesso!" -ForegroundColor Green
} else {
    Write-Error "Falha ao compilar Instalador."
}

# 3. Gerar Pacote Compactado ZIP com Banco e Recursos
Write-Host "[3/3] Gerando pacote ZIP para distribuicao com banco e vault..." -ForegroundColor Yellow
$ZipPath = Join-Path $ReleaseDir "AI-PostGen-Portable-v1.0.0-windows-x64.zip"
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

$StagingDir = Join-Path $ReleaseDir "AI-PostGen-Package"
if (Test-Path $StagingDir) { Remove-Item $StagingDir -Recurse -Force }
New-Item -ItemType Directory -Path $StagingDir | Out-Null

Copy-Item $PortableOut (Join-Path $StagingDir "AI-PostGen-Portable.exe") -Force
Copy-Item $SetupOut (Join-Path $StagingDir "AI-PostGen-Setup.exe") -Force
Copy-Item (Join-Path $ScriptDir "package.json") $StagingDir -Force
Copy-Item (Join-Path $ScriptDir "global_config.json") $StagingDir -Force
Copy-Item (Join-Path $ScriptDir ".env.example") $StagingDir -Force

if (Test-Path (Join-Path $ScriptDir ".data")) {
    Copy-Item (Join-Path $ScriptDir ".data") $StagingDir -Recurse -Force
}
if (Test-Path (Join-Path $ScriptDir "Obsidian vault neural brain")) {
    Copy-Item (Join-Path $ScriptDir "Obsidian vault neural brain") $StagingDir -Recurse -Force
}
if (Test-Path (Join-Path $ScriptDir "public")) {
    Copy-Item (Join-Path $ScriptDir "public") $StagingDir -Recurse -Force
}
if (Test-Path (Join-Path $ScriptDir ".next")) {
    Copy-Item (Join-Path $ScriptDir ".next") $StagingDir -Recurse -Force
}

Compress-Archive -Path (Join-Path $StagingDir "*") -DestinationPath $ZipPath -Force
Remove-Item $StagingDir -Recurse -Force
Write-Host "  OK: Pacote compactado com banco de dados gerado em: $ZipPath" -ForegroundColor Green

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " BUILD CONCLUIDO COM SUCESSO!" -ForegroundColor Green
Write-Host " Arquivos prontos em: release/" -ForegroundColor White
Write-Host " - AI-PostGen-Portable.exe" -ForegroundColor White
Write-Host " - AI-PostGen-Setup.exe" -ForegroundColor White
Write-Host " - AI-PostGen-Portable-v1.0.0-windows-x64.zip" -ForegroundColor White
Write-Host "=========================================" -ForegroundColor Cyan
