import { useState } from "react";
import { Link, useLocation } from "wouter";
import { LyoDexLogo } from "@/components/LyoDexLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth, type UserRole } from "@/lib/auth";
import { Building2, ShoppingCart } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { register } = useAuth();
  const { t } = useLanguage();
  const r = t.register;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("buyer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError(r.passwordError);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const user = await register(name, email, password, role);
      toast({ title: r.welcomeTitle, description: `${r.welcomeDesc} ${user.name}` });
      setLocation(user.role === "operator" ? "/dashboard" : "/dashboard");
    } catch (err: any) {
      setError(err.message ?? r.registrationFailed);
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
          <h1 className="text-2xl font-bold tracking-tight">{r.title}</h1>
          <p className="text-sm text-muted-foreground mt-2">{r.subtitle}</p>
        </div>

        <Card className="border shadow-md">
          <form onSubmit={handleSubmit}>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>{r.joiningAs}</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(["buyer", "operator"] as UserRole[]).map((rv) => (
                    <button
                      key={rv}
                      type="button"
                      onClick={() => setRole(rv)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors text-sm font-medium ${
                        role === rv
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-background hover:border-primary/40"
                      }`}
                    >
                      {rv === "buyer" ? (
                        <ShoppingCart className="w-5 h-5" />
                      ) : (
                        <Building2 className="w-5 h-5" />
                      )}
                      {rv === "buyer" ? r.buyer : r.operator}
                      <span className="text-[11px] font-normal text-muted-foreground text-center leading-tight">
                        {rv === "buyer" ? r.buyerDesc : r.operatorDesc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{r.fullName}</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={r.namePlaceholder}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{r.workEmail}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={r.emailPlaceholder}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{r.password}</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder={r.passwordPlaceholder}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
              )}
            </CardContent>

            <CardFooter className="flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? r.creatingAccount : r.createAccount}
              </Button>
              <div className="text-sm text-muted-foreground text-center">
                {r.alreadyHaveAccount}{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  {r.signIn}
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        <p className="text-[11px] text-muted-foreground text-center mt-6">
          {r.termsNote}
        </p>
      </div>
    </div>
  );
}
