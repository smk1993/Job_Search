import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search, MessageSquare, FileText, Mail, Shield, BarChart2,
  Zap, Globe, ArrowRight, Check, Star,
} from "lucide-react";

const features = [
  { icon: Search, title: "Multi-Platform Job Search", description: "Search across LinkedIn, Indeed, Glassdoor, and ZipRecruiter in one place with real-time results.", color: "bg-blue-100 text-blue-600" },
  { icon: MessageSquare, title: "Reddit Job Scraper", description: "Discover exclusive jobs from r/forhire, r/remotejobs, r/jobpostings and more — with direct DM access to posters.", color: "bg-orange-100 text-orange-600" },
  { icon: Shield, title: "Work Authorization Filter", description: "Never waste time on jobs you can't take. Automatically filters jobs based on your country and visa status.", color: "bg-green-100 text-green-600" },
  { icon: FileText, title: "AI Cover Letter Studio", description: "Generate personalized, streaming cover letters powered by Claude AI. Three tone options, fully editable.", color: "bg-purple-100 text-purple-600" },
  { icon: Mail, title: "Email Recruiters Directly", description: "Send professional emails to recruiters from the platform. Full history tracking included.", color: "bg-pink-100 text-pink-600" },
  { icon: BarChart2, title: "Application Analytics", description: "Track your application funnel from saved to offer. Visualize your job search with interactive charts.", color: "bg-yellow-100 text-yellow-600" },
];

const steps = [
  { step: "1", title: "Set Your Profile", desc: "Tell us your country and work authorization status. We automatically filter ineligible jobs." },
  { step: "2", title: "Search & Discover", desc: "Search across all platforms and Reddit simultaneously. See only jobs you can actually apply to." },
  { step: "3", title: "Apply with AI Power", desc: "Generate cover letters with one click, email recruiters, and track every application." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg">JobFinder</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild><Link href="/login">Sign In</Link></Button>
            <Button asChild><Link href="/register">Get Started</Link></Button>
          </div>
        </div>
      </nav>

      <section className="py-20 px-4 text-center bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto">
          <Badge className="mb-6 gap-1.5 px-3 py-1.5 text-sm" variant="secondary">
            <Globe className="h-3.5 w-3.5" />
            Built for global job seekers
          </Badge>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Find Jobs That You&apos;re<br />
            <span className="text-primary">Actually Eligible For</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Search across LinkedIn, Indeed, Glassdoor, and Reddit. Automatically filters jobs based on your work authorization status. Generate AI cover letters. Email recruiters directly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="gap-2 text-base px-8">
              <Link href="/register">Start for Free <ArrowRight className="h-5 w-5" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base px-8">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">No credit card required • Free forever plan available</p>
        </div>
      </section>

      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4">Everything you need to land your next job</h2>
            <p className="text-gray-600 max-w-xl mx-auto">Purpose-built for international job seekers who are tired of wasting time on jobs they cannot take.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <Card key={f.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className={`h-12 w-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">How it works</h2>
          <p className="text-gray-600 mb-14">Three steps to a smarter job search</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.step} className="flex flex-col items-center">
                <div className="h-14 w-14 rounded-full bg-primary text-white text-xl font-bold flex items-center justify-center mb-4">{s.step}</div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-gray-600 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Simple pricing</h2>
          <p className="text-gray-600 mb-14">Start free, upgrade when you need more</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {[
              { name: "Free", price: "$0", period: "forever", features: ["50 job searches/month", "Reddit job scraping", "Work auth filtering", "5 cover letters/month", "Application tracking"], cta: "Get Started Free", highlighted: false },
              { name: "Pro", price: "$9", period: "per month", features: ["Unlimited job searches", "Reddit job scraping", "Work auth filtering", "Unlimited cover letters", "Email recruiter (50/mo)", "Priority support"], cta: "Start Free Trial", highlighted: true },
            ].map((plan) => (
              <Card key={plan.name} className={plan.highlighted ? "border-primary border-2 shadow-lg" : ""}>
                <CardContent className="p-8">
                  {plan.highlighted && <Badge className="mb-4 gap-1"><Star className="h-3 w-3" />Most Popular</Badge>}
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <div className="mt-2 mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-gray-500 text-sm">/{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8 text-sm text-left">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 flex-shrink-0" />{f}</li>
                    ))}
                  </ul>
                  <Button className="w-full" variant={plan.highlighted ? "default" : "outline"} asChild>
                    <Link href="/register">{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-primary text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Start your smart job search today</h2>
          <p className="text-primary-foreground/80 mb-8">Join job seekers around the world who are finding the right opportunities faster.</p>
          <Button size="lg" variant="secondary" asChild className="gap-2 px-8 text-base">
            <Link href="/register">Get Started Free <ArrowRight className="h-5 w-5" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8 px-4 text-center text-sm text-gray-500">
        <p>© 2025 JobFinder. Built for global job seekers.</p>
      </footer>
    </div>
  );
}
