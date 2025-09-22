import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AuthCodeError() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-red-600">
            Authentication Error
          </CardTitle>
          <CardDescription>
            There was an error signing you in. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>This could be due to:</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Invalid or expired authentication code</li>
              <li>Network connectivity issues</li>
              <li>Authentication provider configuration</li>
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/">Return Home</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/auth/signin">Try Again</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
