import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">M&A Deal OS</CardTitle>
          <CardDescription>Sign in to manage your deals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild className="w-full">
            <a href="/api/auth/signin/microsoft-entra-id">Sign in with Microsoft</a>
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          <Button variant="outline" asChild className="w-full">
            <Link href="/deals">Continue as Guest (Dev Mode)</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
