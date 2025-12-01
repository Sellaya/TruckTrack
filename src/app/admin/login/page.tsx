'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { loginAdmin } from '@/lib/admin-auth';
import { Shield, Mail, Lock, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginAdmin(email, password);

      if (result.success) {
        toast({
          title: "Login Successful",
          description: "Welcome to the admin dashboard!",
        });
        router.push('/dashboard');
      } else {
        toast({
          title: "Login Failed",
          description: result.error || "Invalid credentials. Please check your email and password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4 sm:p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content Container - Perfectly Centered */}
      <div className="w-full max-w-md mx-auto relative z-10">
        {/* Logo and Branding Section */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center mb-5 sm:mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl"></div>
              <div className="relative bg-gradient-to-br from-primary to-primary/90 p-4 sm:p-5 rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
                <Shield className="h-10 w-10 sm:h-12 sm:w-12 text-primary-foreground" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 tracking-tight">
            TruckTrack
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground font-medium">
            Admin Portal
          </p>
        </div>

        {/* Login Card - Enhanced Design */}
        <Card className="shadow-2xl border-2 border-border/50 bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-3 pb-6 sm:pb-8 px-6 sm:px-8 pt-6 sm:pt-8">
            <CardTitle className="text-2xl sm:text-3xl font-bold text-center bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Admin Login
            </CardTitle>
            <CardDescription className="text-center text-sm sm:text-base px-2">
              Enter your admin credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 sm:px-8 pb-6 sm:pb-8 pt-0">
            <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
              {/* Email Field */}
              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                  Email Address
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim())}
                    required
                    disabled={isLoading}
                    className="pl-11 h-12 text-base border-2 focus:border-primary transition-colors"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2.5">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                  Password
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-11 h-12 text-base border-2 focus:border-primary transition-colors"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Login Button */}
              <Button 
                type="submit" 
                className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold mt-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <p className="text-center text-xs sm:text-sm text-muted-foreground mt-8 sm:mt-10 font-medium">
          <a 
            href="/" 
            className="hover:underline text-primary"
          >
            ← Back to Home
          </a>
        </p>
      </div>
    </div>
  );
}
