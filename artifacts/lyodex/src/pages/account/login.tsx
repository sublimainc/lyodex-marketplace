import { useState } from "react";
import { Link, useLocation } from "wouter";
import { LyoDexLogo } from "@/components/LyoDexLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const l = t.login;
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await login(email, password);
      toast({ title: l.authSuccess, description: l.authSuccessDesc });
      setLocation(user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-14rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <LyoDexLogo size={48} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{l.title}</h1>
          <p className="text-sm text-muted-foreground mt-2">{l.subtitle}</p>
        </div>

        <Card className="border shadow-md">
          <form onSubmit={handleLogin}>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{l.workEmail}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={l.emailPlaceholder}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-login-email"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{l.password}</Label>
                  <Link href="/forgot-password" className="text-xs text-primary font-medium hover:underline">
                    {l.forgotPassword}
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-login-password"
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
              )}
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading} data-testid="btn-login-submit">
                {loading ? l.authenticating : l.signIn}
              </Button>
              <div className="text-sm text-muted-foreground text-center">
                {l.noAccount}{" "}
                <Link href="/register" className="text-primary hover:underline font-medium">
                  Create account
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-6">
          {l.accessRestricted}
        </p>
      </div>
    </div>
  );
}
