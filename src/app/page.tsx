import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search, MessageSquare, FileText, Mail, Shield, BarChart2,
  Zap, Globe, ArrowRight, Check, Star,
  CheckCircle2, Lightbulb, Target,
} from "lucide-react";

const features = [
  { icon: Shield, title: "Work Authorization Filter", description: "Never waste time on jobs you can't take. Automatically filters jobs based on your country and visa status. Supports H1B, F1/OPT, L1, O1, Green Card holders, and more.", color: "bg-green-100 text-green-600", featured: true },
  { icon: Search, title: "Multi-Platform Job Search", description: "Search across LinkedIn, Indeed, Glassdoor, and ZipRecruiter in one place with real-time results.", color: "bg-blue-100 text-blue-600" },
  { icon: MessageSquare, title: "Reddit Job Scraper", description: "Discover exclusive jobs from r/forhire, r/remotejobs, r/jobpostings and more — with direct DM access to posters.", color: "bg-orange-100 text-orange-600" },
  { icon: FileText, title: "AI Cover Letter Studio", description: "Generate personalized, streaming cover letters powered by Claude AI. Three tone options, fully editable.", color: "bg-purple-100 text-purple-600" },
  { icon: Mail, title: "Email Recruiters Directly", description: "Send professional emails to recruiters from the platform. Full history tracking included.", color: "bg-pink-100 text-pink-600" },
  { icon: BarChart2, title: "Application Analytics", description: "Track your application funnel from saved to offer. Visualize your job search with interactive charts.", color: "bg-yellow-100 text-yellow-600" },
];

const steps = [
  { step: "1", title: "Set Your Visa Status", desc: "Tell us your country and work authorization status (H1B, OPT, L1, O1, etc.). Your profile, our algorithm.", icon: CheckCircle2 },
  { step: "2", title: "Search With Confidence", desc: "Search across all platforms and Reddit simultaneously. See only jobs you can actually apply to — no more wasted clicks.", icon: Target },
  { step: "3", title: "Land the Job", desc: "Generate AI cover letters, email recruiters directly, track applications. All the tools you need to succeed.", icon: Lightbulb },
];

const visaTypes = ["H1B", "F1/OPT", "L1", "O1", "Green Card", "Citizen"];

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
            Trusted by 5,000+ international job seekers
          </Badge>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent leading-tight">
            Stop Applying to Jobs You Can&rsquo;t Take<br />
            <span className="text-primary">Get Visa-Filtered Results Instead</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-3 leading-relaxed">
            Tired of wasting hours on jobs that require sponsorship you can&rsquo;t get? Our AI automatically filters LinkedIn, Indeed, Glassdoor, and Reddit for jobs matching your visa status.
          </p>
          <p className="text-base text-gray-500 max-w-2xl mx-auto mb-10">
            Generate AI cover letters, email recruiters directly, and track your entire application pipeline—all from one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="gap-2 text-base px-8">
              <Link href="/register">Start Searching Free <ArrowRight className="h-5 w-5" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base px-8">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">No credit card required • Free forever plan available</p>
        </div>
      </section>

      <section className="py-12 px-4 bg-gray-50 border-b">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-1">5K+</div>
              <p className="text-sm text-gray-600">Active Job Seekers</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">500K+</div>
              <p className="text-sm text-gray-600">Jobs Filtered</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">5</div>
              <p className="text-sm text-gray-600">Job Platforms</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">6</div>
              <p className="text-sm text-gray-600">Visa Types Supported</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">24/7</div>
              <p className="text-sm text-gray-600">AI Assistant Ready</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4">The International Job Seeker Problem</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">We know your pain. Let us solve it.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-red-50 border border-red-100 rounded-lg p-6">
              <div className="text-3xl mb-3">❌</div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900">Endless Rejection</h3>
              <p className="text-gray-600 text-sm">You apply to jobs that look perfect, only to get rejected because they won&rsquo;t sponsor visas. Hours wasted.</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-lg p-6">
              <div className="text-3xl mb-3">⏰</div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900">No Time for Research</h3>
              <p className="text-gray-600 text-sm">Digging through every job description to find sponsorship details is exhausting. You need to apply faster.</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-lg p-6">
              <div className="text-3xl mb-3">🧠</div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900">Brain Drain</h3>
              <p className="text-gray-600 text-sm">Writing cover letters, researching companies, emailing recruiters—you&rsquo;re doing all the work manually. There has to be a better way.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gradient-to-r from-primary/10 to-blue-100/50">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl p-8 md:p-12 border border-green-200">
            <div className="flex items-start gap-4 mb-6">
              <Shield className="h-8 w-8 text-green-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Your Visa. Our Algorithm. Your Success.</h2>
                <p className="text-gray-600 text-lg mb-6">
                  Tell us your visa status once. Our AI does the rest. Every job is pre-filtered so you only see opportunities you can actually pursue.
                </p>
              </div>
            </div>
            <div className="bg-gradient-to-b from-gray-50 to-white rounded-lg p-6 border border-gray-200 mb-8">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-sm font-semibold text-gray-700 block w-full">We Support These Visa Statuses:</span>
                {visaTypes.map((visa) => (
                  <Badge key={visa} variant="secondary" className="bg-green-100 text-green-700 border-green-300">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {visa}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Smart Filtering</h3>
                  <p className="text-gray-600 text-sm">We read job descriptions and extract visa requirements so you don&rsquo;t have to.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Instant Visibility</h3>
                  <p className="text-gray-600 text-sm">Transparent badges on every job: sponsorship required, not required, or unknown.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Real Opportunities</h3>
                  <p className="text-gray-600 text-sm">Apply to jobs where your visa status is actually compatible. No more false hopes.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Save Hours Every Week</h3>
                  <p className="text-gray-600 text-sm">Stop researching. Start applying to jobs that actually fit your situation.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4">Everything you need to land your next job</h2>
            <p className="text-gray-600 max-w-xl mx-auto">Purpose-built for international job seekers who are tired of wasting time.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <Card key={f.title} className={`border-0 shadow-sm hover:shadow-md transition-shadow ${f.featured ? "lg:col-span-3 md:col-span-2" : ""}`}>
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
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4">Your Path to the Right Job</h2>
            <p className="text-gray-600 text-lg">Three steps to finding visa-eligible opportunities that match your skills and situation</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="flex flex-col items-center">
                  <div className="h-16 w-16 rounded-full bg-primary text-white text-2xl font-bold flex items-center justify-center mb-4 shadow-lg">
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-gray-900">{s.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed text-center">{s.desc}</p>
                  {idx < steps.length - 1 && (
                    <div className="hidden md:block absolute translate-x-64 -translate-y-8">
                      <ArrowRight className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-600 text-lg">Start free. Upgrade only when you need more power. No credit card required.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {[
              { name: "Free", price: "$0", period: "forever", features: ["50 job searches/month", "Reddit job scraping", "Work auth filtering", "5 AI cover letters/month", "Application tracking", "Basic analytics"], cta: "Get Started Free", highlighted: false },
              { name: "Pro", price: "$9", period: "per month", features: ["Unlimited job searches", "Reddit job scraping", "Work auth filtering", "Unlimited AI cover letters", "Email recruiters (50/mo)", "Advanced analytics", "Priority email support", "14-day free trial"], cta: "Start Free Trial", highlighted: true },
            ].map((plan) => (
              <Card key={plan.name} className={plan.highlighted ? "border-primary border-2 shadow-lg relative" : ""}>
                <CardContent className="p-8">
                  {plan.highlighted && (
                    <>
                      <Badge className="mb-4 gap-1 bg-primary"><Star className="h-3 w-3" />Most Popular</Badge>
                      <div className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">Best Value</div>
                    </>
                  )}
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-3 mb-6">
                    <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500 text-sm ml-2">/{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8 text-sm text-left">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" size="lg" variant={plan.highlighted ? "default" : "outline"} asChild>
                    <Link href="/register">{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-12">
            <p className="text-gray-600 text-sm">All plans include core visa filtering. Free plan is truly unlimited.</p>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Trusted by International Job Seekers Worldwide</h2>
            <p className="text-gray-600 text-lg">Real stories from people who landed their dream jobs</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "I was getting rejected from every job because they wouldn't sponsor my H1B. This tool showed me which companies actually hire international talent. Got an offer in 3 weeks.",
                name: "Priya M.",
                title: "Software Engineer",
                visa: "H1B",
                avatar: "PM"
              },
              {
                quote: "As an F1/OPT student, time matters. Instead of spending hours reading job descriptions, I got a curated list of visa-eligible jobs. Applied to 15, got 3 interviews, accepted one.",
                name: "Ahmed K.",
                title: "Data Analyst",
                visa: "F1/OPT",
                avatar: "AK"
              },
              {
                quote: "The AI cover letters are a game-changer. I was writing each one manually and it took forever. Now I generate 5 tailored letters in the time it used to take me 1.",
                name: "Sofia R.",
                title: "Product Manager",
                visa: "L1",
                avatar: "SR"
              }
            ].map((testimonial, idx) => (
              <Card key={idx} className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm mb-4 italic leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-4 border-t">
                    <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{testimonial.name}</div>
                      <div className="text-xs text-gray-500">{testimonial.title}</div>
                      <Badge variant="secondary" className="mt-1 text-xs">{testimonial.visa}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gradient-to-r from-primary to-blue-600 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold mb-4 leading-tight">Ready to Stop Wasting Time on Wrong Jobs?</h2>
          <p className="text-lg text-primary-foreground/90 mb-8 leading-relaxed">
            Join 5,000+ international job seekers who&rsquo;ve already discovered the power of visa-filtered job search. Your first job alert is just seconds away.
          </p>
          <Button size="lg" variant="secondary" asChild className="gap-2 px-10 py-6 text-base font-semibold">
            <Link href="/register">Start Searching Free <ArrowRight className="h-5 w-5" /></Link>
          </Button>
          <p className="text-primary-foreground/70 mt-6 text-sm">No credit card. No commitment. 100% free to start.</p>
        </div>
      </section>

      <footer className="border-t bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-white">JobFinder</span>
              </div>
              <p className="text-sm text-gray-500">AI-powered job search for international job seekers.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/register" className="hover:text-white transition">Get Started</Link></li>
                <li><Link href="/login" className="hover:text-white transition">Sign In</Link></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
            <p>© 2025 JobFinder. All rights reserved. Built with care for global job seekers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
