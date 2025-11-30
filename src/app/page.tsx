'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Truck, 
  Route, 
  DollarSign, 
  BarChart3, 
  FileText, 
  Shield, 
  User, 
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Calendar,
  Package
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();

  const features = [
    {
      icon: Route,
      title: 'Trip Logging',
      description: 'Log all relevant information for each trip with detailed route tracking and scheduling.',
    },
    {
      icon: DollarSign,
      title: 'Expense Tracking',
      description: 'Track fuel, maintenance, and operating expenses with multi-currency support (CAD & USD).',
    },
    {
      icon: TrendingUp,
      title: 'Income Tracking',
      description: 'Log income from each delivery and calculate profit per trip, day, week, or month.',
    },
    {
      icon: BarChart3,
      title: 'Performance Dashboard',
      description: 'Visualize key metrics including revenue, expenses, and profit margins in real-time.',
    },
    {
      icon: FileText,
      title: 'Report Generation',
      description: 'Generate and export detailed reports for accounting with customizable date ranges.',
    },
    {
      icon: Package,
      title: 'Fleet Management',
      description: 'Manage your truck units, drivers, and assignments all in one place.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
      {/* Navigation Bar */}
      <nav className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="bg-primary p-2 rounded-lg group-hover:bg-primary/90 transition-colors duration-300">
                <Truck className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">TruckTrack</h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 lg:pt-16 pb-8 sm:pb-12 lg:pb-16">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="text-center mb-8 sm:mb-10">
            <div className="inline-flex items-center justify-center mb-4 sm:mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-primary to-primary/90 p-5 sm:p-6 rounded-3xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
                  <Truck className="h-14 w-14 sm:h-16 sm:w-16 text-primary-foreground" />
                </div>
              </div>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-3 sm:mb-4 tracking-tight">
              TruckTrack
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground mb-4 sm:mb-5 max-w-3xl mx-auto font-medium">
              Comprehensive Fleet Management & Expense Tracking System
            </p>
            <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
              Streamline your trucking operations with powerful tools for trip logging, expense tracking, profit calculation, and detailed reporting.
            </p>

            {/* Login Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Button
                size="lg"
                onClick={() => router.push('/admin/login')}
                className="w-full sm:w-auto h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                <Shield className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
                Login as Admin
                <ArrowRight className="ml-2 h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push('/driver/login')}
                className="w-full sm:w-auto h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg font-semibold border-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                <User className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
                Login as Driver
                <ArrowRight className="ml-2 h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-14 bg-muted/20">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              Powerful Features
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage your fleet operations efficiently
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group p-5 sm:p-6 rounded-2xl border-2 border-border bg-card hover:bg-primary/5 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="mb-4">
                    <div className="inline-flex p-3 rounded-xl bg-primary/10 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                      <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 sm:mb-3 group-hover:text-primary transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Key Benefits Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-14">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-5 sm:mb-6">
                Why Choose TruckTrack?
              </h2>
              <div className="space-y-3 sm:space-y-4">
                {[
                  'Multi-currency expense tracking (CAD & USD)',
                  'Real-time dashboard with key performance metrics',
                  'Comprehensive trip logging with route tracking',
                  'Automated profit calculation and reporting',
                  'Detailed reports exportable for accounting',
                  'User-friendly interface for both admins and drivers',
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3 sm:gap-4 group">
                    <div className="p-1 rounded-lg bg-primary/10 group-hover:bg-primary transition-colors duration-300 flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                    </div>
                    <p className="text-base sm:text-lg text-muted-foreground group-hover:text-foreground transition-colors duration-300 pt-0.5">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl blur-3xl"></div>
              <div className="relative p-6 sm:p-8 lg:p-10 rounded-3xl border-2 border-border bg-card/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                <div className="space-y-5 sm:space-y-6">
                  <div className="flex items-center gap-4 group">
                    <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                      <MapPin className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg sm:text-xl text-foreground group-hover:text-primary transition-colors duration-300">Route Management</h3>
                      <p className="text-sm sm:text-base text-muted-foreground">Track origins and destinations with precise location data</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group">
                    <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                      <Calendar className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg sm:text-xl text-foreground group-hover:text-primary transition-colors duration-300">Trip Scheduling</h3>
                      <p className="text-sm sm:text-base text-muted-foreground">Manage upcoming, ongoing, and completed trips efficiently</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group">
                    <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                      <DollarSign className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg sm:text-xl text-foreground group-hover:text-primary transition-colors duration-300">Financial Insights</h3>
                      <p className="text-sm sm:text-base text-muted-foreground">Get comprehensive financial insights and profit analysis</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-14 bg-gradient-to-br from-primary/5 via-primary/3 to-accent/5">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
            Choose your login option below to access your dashboard and start managing your fleet operations.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Button
              size="lg"
              onClick={() => router.push('/admin/login')}
              className="w-full sm:w-auto h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              <Shield className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
              Admin Login
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push('/driver/login')}
              className="w-full sm:w-auto h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg font-semibold border-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              <User className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
              Driver Login
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t bg-background py-6 sm:py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              Product by{' '}
              <a
                href="https://instagram.com/sellayadigital"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-foreground hover:text-primary hover:underline transition-all duration-300"
              >
                Sellaya
              </a>
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              © {new Date().getFullYear()} TruckTrack. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}