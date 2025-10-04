# Developer Mode Guide

This guide explains how to use Developer Mode to bypass authentication when developing and testing your application locally.

## Overview

Developer Mode allows you to skip the authentication flow entirely during local development. When enabled, the application will:

- Bypass all authentication checks in middleware
- Provide a mock user session automatically
- Allow access to all protected routes without signing in
- Skip redirects to sign-in pages

This significantly speeds up development by removing the need to repeatedly sign in during testing.

## ⚠️ Important Warning

**Developer Mode should ONLY be enabled in local development environments. NEVER enable it in production, staging, or any publicly accessible environment.**

## Quick Setup

### 1. Create or Update `.env.local`

In your project root, create a `.env.local` file (or update the existing one) and add:

```bash
NEXT_PUBLIC_DEV_MODE=true
```

### 2. Restart Your Development Server

Developer mode requires a server restart to take effect:

```bash
# Stop your current dev server (Ctrl+C)
# Then restart it
npm run dev
```

### 3. Verify It's Working

When developer mode is active, you should see a console message:

```
🔧 Developer Mode Active
Authentication is bypassed. Using mock user: dev@localhost.local
```

You can now access protected routes like `/upload` and `/contributions` without signing in!

## Mock User Details

When developer mode is enabled, the application uses a mock user with these properties:

- **User ID**: `dev-user-id-123`
- **Email**: `dev@localhost.local`
- **Role**: `authenticated`

This mock user is recognized throughout the application, allowing you to test user-specific features.

## How It Works

Developer mode modifies three key areas of authentication:

### 1. Middleware (`middleware.ts`)

- Detects developer mode and bypasses all auth checks
- Allows access to protected routes without validation

### 2. Auth Context (`lib/auth/context.tsx`)

- Provides mock user and session data
- Skips Supabase authentication calls

### 3. Protected Route Component (`components/auth/protected-route.tsx`)

- Renders protected content without checking authentication
- Skips loading states and redirects

## API Routes and Database Access

**Important**: Developer mode only bypasses frontend authentication checks. Your API routes may still require authentication tokens.

If you need to test API routes that check authentication, you may need to:

1. Add similar dev mode checks to your API routes
2. Or, temporarily disable auth checks in specific API routes during development
3. Or, use the mock user ID (`dev-user-id-123`) in your database for testing

## Disabling Developer Mode

To return to normal authentication:

1. Edit `.env.local` and set:

   ```bash
   NEXT_PUBLIC_DEV_MODE=false
   ```

   Or simply remove the line entirely.

2. Restart your development server

## Environment Variables Summary

| Variable               | Values           | Default | Description                     |
| ---------------------- | ---------------- | ------- | ------------------------------- |
| `NEXT_PUBLIC_DEV_MODE` | `true` / `false` | `false` | Enables/disables developer mode |

## Troubleshooting

### Developer Mode Not Working

**Problem**: Setting `NEXT_PUBLIC_DEV_MODE=true` but still being redirected to sign-in

**Solutions**:

1. Ensure you've restarted your development server after changing `.env.local`
2. Check that the value is exactly `true` (lowercase, no quotes needed)
3. Clear your browser cache and cookies
4. Check the browser console for the developer mode message

### API Calls Failing

**Problem**: Frontend works but API calls return 401 Unauthorized

**Solution**: API routes may still require authentication. You'll need to:

- Add dev mode checks to relevant API routes
- Or create test data using the mock user ID (`dev-user-id-123`)

### Database Queries Return Empty

**Problem**: Protected pages load but show no user data

**Solution**: The mock user doesn't exist in your database. Either:

- Create a profile in your database with ID `dev-user-id-123`
- Or modify the mock user ID in `lib/dev-mode.ts` to match an existing user

## Code Reference

The developer mode implementation can be found in:

- `lib/dev-mode.ts` - Core utilities and mock data
- `middleware.ts` - Server-side auth bypass
- `lib/auth/context.tsx` - Client-side mock session
- `components/auth/protected-route.tsx` - Component-level bypass

## Best Practices

1. **Never commit `.env.local`** - This file should be in your `.gitignore`
2. **Document dev mode usage** - Ensure your team knows how to use it
3. **Test with real auth periodically** - Don't rely solely on dev mode
4. **Create test data** - Set up a test user with ID `dev-user-id-123` in your development database
5. **Security reviews** - Before deploying, verify `NEXT_PUBLIC_DEV_MODE` is not set in production

## Customizing the Mock User

To customize the mock user data, edit `lib/dev-mode.ts`:

```typescript
export const DEV_USER: User = {
  id: "your-custom-id",
  email: "custom@email.com",
  // ... other properties
};
```

Remember to restart your dev server after making changes.

## Production Safety

The implementation is designed to be safe:

- Environment variable must be explicitly set to `"true"` (string)
- Only works when `NEXT_PUBLIC_DEV_MODE=true`
- No performance impact when disabled
- Easy to verify in code reviews

However, always double-check your production environment variables before deploying!
