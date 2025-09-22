# Authentication Setup

This document describes the authentication system implemented for the Ambiguity application.

## Features

- **Email Authentication**: Users can sign up and sign in with email and password
- **Social Authentication**: Support for Google and GitHub OAuth
- **Password Reset**: Users can reset their password via email
- **Route Protection**: Protected routes require authentication
- **Session Management**: Automatic session handling with Supabase

## Components

### Auth Context (`lib/auth/context.tsx`)

- Provides authentication state throughout the application
- Handles sign in, sign up, OAuth, and sign out
- Manages user session and loading states

### Auth Forms

- `components/auth/signin-form.tsx`: Sign in with email or social providers
- `components/auth/signup-form.tsx`: Create account with email or social providers
- `components/auth/forgot-password-form.tsx`: Request password reset

### Protected Route (`components/auth/protected-route.tsx`)

- Wrapper component for pages that require authentication
- Redirects unauthenticated users to sign in page

### Updated Auth Button (`components/auth-button.tsx`)

- Updated to use the new auth context
- Shows user avatar and email when signed in
- Links to sign in page when not authenticated

## Pages

- `/auth/signin`: Sign in page
- `/auth/signup`: Sign up page
- `/auth/forgot-password`: Password reset request
- `/auth/reset-password`: Set new password after clicking reset link
- `/auth/auth-code-error`: Error page for OAuth failures

## Route Protection

### Middleware (`middleware.ts`)

- Protects routes: `/upload`, `/contributions`
- Redirects unauthenticated users to sign in
- Redirects authenticated users away from auth pages

### Protected Pages

- Upload page (`app/upload/page.tsx`)
- Contributions page (`app/contributions/page.tsx`)

## OAuth Configuration

To enable social authentication, configure the following providers in your Supabase dashboard:

1. **Google**: Enable Google provider and add client credentials
2. **GitHub**: Enable GitHub provider and add client credentials

Set the redirect URL to: `https://yourdomain.com/auth/callback`

## Environment Variables

Ensure these environment variables are set:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Usage

### Using Auth Context

```tsx
import { useAuth } from "@/lib/auth/context";

function MyComponent() {
  const { user, loading, signOut } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please sign in</div>;

  return <div>Welcome, {user.email}!</div>;
}
```

### Protecting Routes

```tsx
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function MyProtectedPage() {
  return (
    <ProtectedRoute>
      <div>This content requires authentication</div>
    </ProtectedRoute>
  );
}
```

## Database Schema

The authentication system works with Supabase's built-in `auth.users` table. The existing schema includes references to `auth.users(id)` in the definitions table for user-specific data.

## Security Features

- Row Level Security (RLS) policies protect user data
- Password requirements (minimum 6 characters)
- Email confirmation for new accounts
- Secure OAuth redirect handling
- Session-based authentication with automatic token refresh
