---
description: Run code quality checks on every code change
---

# Code Review Workflow

Run these checks on any code changes before committing.

## CodeRabbit CLI Review (Primary Method)
// turbo-all

Run CodeRabbit CLI in WSL to get AI-powered code review:

```bash
# In WSL terminal (wsl -d Ubuntu-24.04):
cd /mnt/c/Users/prabh/Downloads/Sociovia_app
~/.local/bin/coderabbit review --plain
```

Or use the short command:
```bash
cr review --plain
```

### Review Options:
- `--plain` : Detailed feedback with fix suggestions
- `--prompt-only` : Minimal output for token efficiency

## Quick TypeScript/ESLint Check (Fallback)

If CodeRabbit CLI is unavailable:

1. **TypeScript Type Check**
```powershell
cd c:\Users\prabh\Downloads\Sociovia_app\frontend\sociovia-launchpad-31-prabhu_4_12_2025
npx tsc --noEmit --skipLibCheck
```

2. **ESLint Check**
```powershell
npm run lint
```

## Full Review (Before PR)

1. Run CodeRabbit CLI review
2. Fix any issues found
3. Push to GitHub branch
4. Create PR - CodeRabbit GitHub App will also review
5. Address any additional comments

## After Fixing Issues

1. Re-run CodeRabbit CLI to verify fixes
2. Commit with descriptive message
3. Push to update PR
