# Backend API URL Changes

This document lists all frontend files where the backend API URL was changed from the production URL to the local development URL.

## Change Summary

| Original URL | New URL |
|--------------|---------|
| `https://sociovia-backend-362038465411.europe-west1.run.app` | `http://127.0.0.1:5000` |
| `https://6136l5dn-5000.inc1.devtunnels.ms` | `http://127.0.0.1:5000` |

## Configuration Files

| File | Line(s) | Change |
|------|---------|--------|
| `vite.config.ts` | 13 | Proxy target changed to `http://127.0.0.1:5000` |

## Files Modified

### Pages (`src/pages/`)

| File | Line(s) | Variable/Usage |
|------|---------|----------------|
| `AdAccounts.tsx` | 7 | `API_ADACCOUNTS` |
| `Assistant.tsx` | 131 | `apiBaseUrl` default parameter |
| `AudienceSetup.tsx` | 27, 517 | `API_BASE`, fetch URL |
| `BudgetSchedule.tsx` | 17 | `API_BASE` |
| `CreativeChoice.tsx` | 11 | `API_BASE` |
| `CreativeChoice2.tsx` | 17 | `API_ORIGIN` |
| `CreativeEditor.tsx` | 14, 15 | `WORKSPACE_API_ROOT`, `API_URL` |
| `Dashboard.tsx` | 383 | API base URL string |
| `fbuser.tsx` | 16 | `API_BASE` |
| `ForgotPassword.tsx` | 9 | `API_BASE` |
| `InstagramFBOAuth.tsx` | 25 | `apiBase` default parameter |
| `Login.tsx` | (uses shared lib) | - |
| `ObjectiveSelection.tsx` | 99 | `API_BASE` |
| `ResetPassword.tsx` | 18 | `__API_BASE__` fallback |
| `ReviewAndConfirm.tsx` | 73, 581 | `API_BASE`, fetch URL |
| `Signup.tsx` | 15, 201 | `API_BASE`, fetch URL |
| `TokenTracking.tsx` | 48 | fetch URL |
| `UnderReview.tsx` | 12 | `API_STATUS` |
| `UserManagement.tsx` | 10, 11, 12 | `API_LIST`, `API_INVITE`, `API_REMOVE` |
| `VerifyEmail.tsx` | 81, 136 | fetch URLs |
| `workspace.tsx` | 36 | `API_BASE` |
| `WorkspaceAssets.tsx` | 80 | `API_BASE` |
| `WorkspaceDetails.tsx` | 9 | `API_METRICS` |
| `WorkspaceEdit.tsx` | 12 | `API_BASE` |
| `WorkspaceList.tsx` | 388 | `API_BASE` |
| `WorkspaceManage.tsx` | 52 | `API_BASE` |
| `WorkspaceSetup.tsx` | 291 | `API_BASE` |
| `WorkspaceUsers.tsx` | 10, 11 | `API_USERS_LIST`, `API_USERS_INVITE` |
| `WorkflowBuilder.tsx` | 88 | `API_BASE` |

### Admin Pages (`src/pages/admin/`)

| File | Line(s) | Variable/Usage |
|------|---------|----------------|
| `AdminLogin.tsx` | 33 | fetch URL |
| `AdminReview.tsx` | 40 | `API_BASE` |

### Marketing UI (`src/marketingUI/`)

| File | Line(s) | Variable/Usage |
|------|---------|----------------|
| `CampaignDetails.tsx` | 50 | `API_BASE` |
| `ChatUI.tsx` | 75, 80, 718, 2596 | `FALLBACK_BACKEND`, `API_BASE`, URL replacements |
| `ChatUI2.tsx` | 38, 40 | `FALLBACK_BACKEND`, `API_BASE` |
| `MarketingDashboard.tsx` | 19 | `API_BASE` |

### CRM (`src/crm/`)

| File | Line(s) | Variable/Usage |
|------|---------|----------------|
| `api.ts` | 129 | fetch URL |
| `pages/IntegrationDetail.tsx` | 50 | `getBackendUrl()` |
| `pages/Settings.tsx` | 233 | `getBackendUrl()` |

### Hooks (`src/hooks/`)

| File | Line(s) | Variable/Usage |
|------|---------|----------------|
| `useMetaEstimate.ts` | 116 | fetch URL |
| `useSessionCheck.ts` | 5 | `API_BASE` |

### Libraries (`src/lib/`)

| File | Line(s) | Variable/Usage |
|------|---------|----------------|
| `apiClient.ts` | 3 | `API_BASE` |
| `backend.ts` | 2 | `base` URL |

### WhatsApp (`src/whatsapp/`)

| File | Line(s) | Variable/Usage |
|------|---------|----------------|
| `api.ts` | 16 | `API_BASE` |
| `components/ConnectWhatsAppButton.tsx` | 15 | `API_BASE` |

### Contexts (`src/contexts/`)

| File | Line(s) | Variable/Usage |
|------|---------|----------------|
| `AuthContext.tsx` | (uses shared lib) | - |

### Components (`src/components/`)

| File | Line(s) | Variable/Usage |
|------|---------|----------------|
| `PhoneOtp.tsx` | 49, 50 | `BACKEND_SEND`, `BACKEND_VERIFY` (dev tunnel URL) |
| `ai-campaign/FinalPreview.tsx` | 258, 325 | fetch URLs (dev tunnel URL) |

---

## Reverting to Production

To revert back to the production backend URL, replace:
```
http://127.0.0.1:5000
```
with:
```
https://sociovia-backend-362038465411.europe-west1.run.app
```

You can use this PowerShell command in the frontend directory:
```powershell
Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  if ($content -match "127\.0\.0\.1:5000") {
    $newContent = $content -replace "http://127\.0\.0\.1:5000", "https://sociovia-backend-362038465411.europe-west1.run.app"
    Set-Content -Path $_.FullName -Value $newContent -NoNewline
    Write-Host "Updated: $($_.FullName)"
  }
}
```

---

**Last Updated:** December 17, 2025
