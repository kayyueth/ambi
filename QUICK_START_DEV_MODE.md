# Quick Start: Developer Mode

## Enable Developer Mode (3 Easy Steps)

### 1. Create `.env.local` file

In your project root (`/Users/kayyu/ambi/`), create a file named `.env.local` with:

```bash
NEXT_PUBLIC_DEV_MODE=true
```

### 2. Restart your dev server

```bash
# Press Ctrl+C to stop current server
npm run dev
```

### 3. Start developing!

You can now access:

- `/upload` - Upload new terms without signing in
- `/contributions` - View contributions page without signing in
- Any other protected routes

## What You Get

✅ **Mock User**: Automatically signed in as `dev@localhost.local`  
✅ **No Redirects**: Direct access to all protected pages  
✅ **Fast Testing**: No need to sign in repeatedly  
✅ **User ID**: `dev-user-id-123` for testing user-specific features

## Verify It's Working

Open your browser console and look for:

```
🔧 Developer Mode Active
Authentication is bypassed. Using mock user: dev@localhost.local
```

## Turn It Off

Edit `.env.local`:

```bash
NEXT_PUBLIC_DEV_MODE=false
```

Or delete the file entirely, then restart your server.

## ⚠️ Important

**NEVER use developer mode in production!** This should only be used on localhost during development.

---

For detailed information, see `DEV_MODE_GUIDE.md`
