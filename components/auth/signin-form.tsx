"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth/context";
import { Github, Chrome } from "lucide-react";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);

  const { signInWithEmail, signInWithOAuth } = useAuth();
  const router = useRouter();

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const { error } = await signInWithEmail(email, password);

    if (error) {
      setError(error.message);
    } else {
      router.push("/");
    }

    setIsLoading(false);
  };

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    setIsOAuthLoading(provider);
    setError("");

    const { error } = await signInWithOAuth(provider);

    if (error) {
      setError(error.message);
      setIsOAuthLoading(null);
    }
    // OAuth redirect will handle the rest
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Sign in</CardTitle>
        <CardDescription className="text-center">
          Enter your email and password to sign in to your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Social Sign In */}
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthSignIn("google")}
            disabled={isOAuthLoading !== null}
          >
            <Chrome className="mr-2 h-4 w-4" />
            {isOAuthLoading === "google"
              ? "Signing in..."
              : "Continue with Google"}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthSignIn("github")}
            disabled={isOAuthLoading !== null}
          >
            <Github className="mr-2 h-4 w-4" />
            {isOAuthLoading === "github"
              ? "Signing in..."
              : "Continue with GitHub"}
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>

        {/* Email Sign In */}
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Don't have an account? </span>
          <Link href="/auth/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>

        <div className="text-center text-sm">
          <Link
            href="/auth/forgot-password"
            className="text-primary hover:underline"
          >
            Forgot your password?
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
