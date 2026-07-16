# Create Self-Signed Code Signing Certificate for Wallpaper Sync App
# Run this script to generate a certificate and trust it locally on your development machine.

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Wallpaper Sync - Code Signing Setup     " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Define variables
$subject = "CN=WallpaperSyncAppDev"
$pfxFile = Join-Path $PSScriptRoot "self-signed-cert.pfx"
$passwordString = "password"
$password = ConvertTo-SecureString $passwordString -AsPlainText -Force

Write-Host "1. Generating self-signed certificate..." -ForegroundColor Yellow
$cert = New-SelfSignedCertificate -Type CodeSigningCert `
                                  -Subject $subject `
                                  -KeyAlgorithm RSA `
                                  -KeyLength 2048 `
                                  -CertStoreLocation "Cert:\CurrentUser\My" `
                                  -NotAfter (Get-Date).AddYears(5)

Write-Host "Generated certificate: $($cert.Thumbprint)" -ForegroundColor Green

Write-Host "2. Exporting certificate to PFX file..." -ForegroundColor Yellow
if (Test-Path $pfxFile) {
    Remove-Item $pfxFile -Force
}
Export-PfxCertificate -Cert $cert -FilePath $pfxFile -Password $password
Write-Host "Exported PFX to: $pfxFile" -ForegroundColor Green

Write-Host "3. Installing certificate into local user trust stores..." -ForegroundColor Yellow
Write-Host "Installing to 'Trusted Root Certification Authorities'..." -ForegroundColor White
$storeRoot = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser")
$storeRoot.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
$storeRoot.Add($cert)
$storeRoot.Close()

Write-Host "Installing to 'Trusted Publishers'..." -ForegroundColor White
$storePublisher = New-Object System.Security.Cryptography.X509Certificates.X509Store("TrustedPublisher", "CurrentUser")
$storePublisher.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
$storePublisher.Add($cert)
$storePublisher.Close()

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Success! The self-signed certificate has been generated" -ForegroundColor Green
Write-Host "and trusted locally. electron-builder will now sign the" -ForegroundColor Green
Write-Host "executables automatically when you package the application." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
