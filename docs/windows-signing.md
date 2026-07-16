# Windows Code Signing & Smart App Control

This document explains how to resolve issues with Windows Defender SmartScreen and Smart App Control (SAC) blocking the desktop application.

## The Blocking Problem

When you distribute or build an Electron app, Windows protects users from running untrusted software. If the application is **unsigned**, it has no digital reputation. 

* **Smart App Control (SAC)** will immediately block the app because it blocks all unsigned executable files.
* **Windows Defender SmartScreen** will display a blue "Windows protected your PC" warning.

## Solution for Local Development & Testing

We have provided a helper PowerShell script to automate creating a self-signed Code Signing Certificate and trusting it locally on your computer.

### Step-by-Step Local Trust Setup:

1. Open a PowerShell console.
2. Run the script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\create-self-signed-cert.ps1
   ```
3. A browser/system dialog might prompt you to confirm adding the certificate to your "Root" trust store. Accept the prompt.
4. The script generates `scripts/self-signed-cert.pfx` and imports it into your user certificates.
5. Re-compile the application:
   ```bash
   npm run dist
   ```
6. The compiled installer (`dist/Wallpaper Sync App Setup *.exe`) and output binary will be signed using the certificate. Since the certificate is trusted on your local computer, Windows Smart App Control will allow it to run without blocking.

---

## Solution for Production & Public Distribution

Self-signed certificates are **only trusted on machines where they have been manually imported**. For public releases, you must use one of the following methods:

### Method 1: Purchase a Code Signing Certificate (Standard OV or EV)

Purchase a certificate from a trusted Certificate Authority (CA) recognized by Microsoft (e.g., DigiCert, Sectigo, GlobalSign).

1. **Standard OV (Organization Validation)**: Verifies your organization. It takes some downloads/runs on users' machines to build up trust/reputation with SmartScreen.
2. **EV (Extended Validation)**: Requires stricter verification. Builds instant reputation and bypasses SmartScreen warnings immediately.

To sign with your official certificate, update `package.json` to point to your certificate, or set the environment variables during build:
```bash
# Windows command line (PowerShell)
$env:CSC_LINK="path/to/official-cert.pfx"
$env:CSC_KEY_PASSWORD="your-passphrase"
npm run dist
```

### Method 2: Distribute via the Microsoft Store

If you package your Electron application as an `.appx` or `.msix` and publish it through the Microsoft Store:
* Microsoft signs the application for you.
* It passes all Smart App Control and Windows SmartScreen security checks automatically because the Store is globally trusted.
* Updates are handled automatically by the operating system.
