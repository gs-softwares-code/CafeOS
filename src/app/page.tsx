import Link from 'next/link';
import Image from 'next/image';
import {
  Coffee,
  ShoppingBag,
  ChefHat,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Smartphone,
  Store,
  Layers,
  IndianRupee,
  CheckCircle2,
  Bell,
  Clock,
  Printer,
  Sliders,
  UtensilsCrossed,
  Users,
  Compass,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C130E] flex flex-col justify-between selection:bg-[#D9531E] selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-[#E8DED1] bg-white/90 backdrop-blur-md sticky top-0 z-40 transition-all">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-[#D9531E] to-[#C89242] flex items-center justify-center font-black text-white shadow-md group-hover:scale-105 transition-transform">
              <Coffee className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-2xl tracking-tight text-[#1C130E]">
                  CafeOS
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-orange-100 text-[#D9531E] px-2 py-0.5 rounded-full border border-orange-200">
                  Cloud POS & PWA
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium">Independent Café Operating System</p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-stone-700">
            <Link href="#storefront" className="hover:text-[#D9531E] transition">
              Customer PWA
            </Link>
            <Link href="#reception" className="hover:text-[#D9531E] transition">
              Reception POS
            </Link>
            <Link href="#kitchen" className="hover:text-[#D9531E] transition">
              Kitchen Terminal
            </Link>
            <Link href="#architecture" className="hover:text-[#D9531E] transition">
              Architecture & Security
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/cafe/kurali-chai-bakehouse"
              className="text-xs font-bold text-stone-700 hover:text-[#D9531E] px-3.5 py-2 rounded-xl transition hidden sm:inline-flex items-center gap-1.5"
            >
              <Smartphone className="h-4 w-4" />
              <span>Live Storefront</span>
            </Link>
            <Link
              href="/staff-login"
              className="text-xs font-bold bg-[#1C130E] hover:bg-[#D9531E] text-white px-5 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2 active:scale-95"
            >
              <ChefHat className="h-4 w-4 text-[#C89242]" />
              <span>Staff / Admin Portal</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero 16:9 Showcase Section */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-[#E8DED1]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(217,83,30,0.12),rgba(255,255,255,0))]" />
        
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 space-y-12">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#E8DED1] shadow-xs text-xs font-bold text-[#8C2E0A]">
              <Sparkles className="h-4 w-4 text-[#C89242]" />
              <span>Zero Aggregator Commissions • Server-Authoritative INR Billing • Real-time DB Sync</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-[#1C130E] tracking-tight font-serif leading-[1.15]">
              Everything Your Café Needs.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D9531E] via-[#C89242] to-[#B83F12]">
                From Counter to Kitchen.
              </span>
            </h1>

            <p className="text-base sm:text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed">
              A high-performance, multi-tenant digital operations suite. Self-service customer PWA, instant counter POS billing, real-time kitchen tracking, and centralized owner controls.
            </p>

            {/* CTA action cluster */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/cafe/kurali-chai-bakehouse"
                className="px-7 py-4 rounded-2xl bg-[#D9531E] hover:bg-[#B83F12] text-white font-bold text-sm shadow-lg shadow-orange-500/20 transition flex items-center gap-2.5 active:scale-95"
              >
                <Smartphone className="h-5 w-5" />
                <span>Launch Customer Storefront</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/staff-login"
                className="px-7 py-4 rounded-2xl bg-white hover:bg-stone-50 border border-[#E8DED1] text-[#1C130E] font-bold text-sm shadow-sm transition flex items-center gap-2.5 active:scale-95"
              >
                <Users className="h-5 w-5 text-[#C89242]" />
                <span>Staff & Owner Login</span>
              </Link>
            </div>
          </div>

          {/* 3-Role Interactive Architecture Hub */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            {/* Space 1: Customer PWA */}
            <div id="storefront" className="rounded-3xl bg-white border border-[#E8DED1] p-8 shadow-sm flex flex-col justify-between hover:border-[#D9531E] hover:shadow-md transition group">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#D9531E]">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#D9531E]">Customer Space</span>
                  <h3 className="text-2xl font-bold font-serif text-[#1C130E] mt-1">PWA & Smart Ordering</h3>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Mobile-first web app with offline capabilities, push notifications, saved dietary preferences, direct admin inquiries, and live kitchen tracking.
                </p>
                <div className="space-y-2 pt-2 border-t border-stone-100 text-xs text-stone-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Personal taste, milk & sweetness preferences</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Live order status tracking by mobile number</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Zero app store install required (Add to Home)</span>
                  </div>
                </div>
              </div>
              <div className="pt-6 mt-6 border-t border-stone-100 flex items-center justify-between">
                <Link
                  href="/cafe/kurali-chai-bakehouse"
                  className="text-xs font-bold text-[#D9531E] group-hover:underline flex items-center gap-1.5"
                >
                  <span>Open Kurali Storefront</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link href="/account" className="text-xs font-semibold text-stone-500 hover:text-stone-900">
                  Preferences
                </Link>
              </div>
            </div>

            {/* Space 2: Reception POS */}
            <div id="reception" className="rounded-3xl bg-white border border-[#E8DED1] p-8 shadow-sm flex flex-col justify-between hover:border-[#C89242] hover:shadow-md transition group">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#C89242]">
                  <Printer className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#C89242]">Counter Space</span>
                  <h3 className="text-2xl font-bold font-serif text-[#1C130E] mt-1">Reception Counter POS</h3>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Ultra-fast counter catalog for baristas and cashiers. Table allocation, 1-click bill generation, and fast ticket management directly to the database.
                </p>
                <div className="space-y-2 pt-2 border-t border-stone-100 text-xs text-stone-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Instant counter billing & table assignment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Real-time kitchen order queue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Role-protected with staff session cookie</span>
                  </div>
                </div>
              </div>
              <div className="pt-6 mt-6 border-t border-stone-100 flex items-center justify-between">
                <Link
                  href="/reception"
                  className="text-xs font-bold text-[#C89242] group-hover:underline flex items-center gap-1.5"
                >
                  <span>Launch Reception POS</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded">
                  Fast Counter
                </span>
              </div>
            </div>

            {/* Space 3: Admin & Kitchen */}
            <div id="kitchen" className="rounded-3xl bg-white border border-[#E8DED1] p-8 shadow-sm flex flex-col justify-between hover:border-[#1C130E] hover:shadow-md transition group">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-[#1C130E]">
                  <ChefHat className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">Owner Space</span>
                  <h3 className="text-2xl font-bold font-serif text-[#1C130E] mt-1">Admin & Kitchen Terminal</h3>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Real-time kitchen display system (KDS), gross revenue metrics, live price and inventory management, and inbound customer message inbox.
                </p>
                <div className="space-y-2 pt-2 border-t border-stone-100 text-xs text-stone-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Live kitchen orders polling & state transitions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Instant price & availability updates in DB</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Customer message queue & response portal</span>
                  </div>
                </div>
              </div>
              <div className="pt-6 mt-6 border-t border-stone-100 flex items-center justify-between">
                <Link
                  href="/dashboard"
                  className="text-xs font-bold text-[#1C130E] group-hover:underline flex items-center gap-1.5"
                >
                  <span>Open Operations Suite</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <span className="text-[10px] font-bold bg-stone-100 text-stone-800 px-2 py-0.5 rounded">
                  Superadmin & Owner
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Menu & High Performance Visuals */}
      <section className="py-20 bg-white border-b border-[#E8DED1]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#D9531E]">
                High-Performance WebP Catalog
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1C130E] font-serif mt-1">
                Curated Specialty Menu
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 max-w-md">
              Optimized for 16:9 widescreen browsing. Compressed with modern WebP codecs for sub-second page loads on 4G/5G mobile devices.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {/* Item 1 */}
            <div className="rounded-2xl border border-[#E8DED1] overflow-hidden bg-white shadow-xs hover:shadow-md transition">
              <div className="relative aspect-video w-full bg-stone-100">
                <Image
                  src="/images/menu/cold-brew.webp"
                  alt="18-Hour Classic Cold Brew"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-[#1C130E]">18-Hour Classic Cold Brew</h4>
                  <span className="text-sm font-extrabold text-[#D9531E]">₹270</span>
                </div>
                <p className="text-xs text-stone-500 line-clamp-2">
                  Slow-steeped specialty single-origin Arabica cold brew served over crystal ice.
                </p>
              </div>
            </div>

            {/* Item 2 */}
            <div className="rounded-2xl border border-[#E8DED1] overflow-hidden bg-white shadow-xs hover:shadow-md transition">
              <div className="relative aspect-video w-full bg-stone-100">
                <Image
                  src="/images/menu/croissant.webp"
                  alt="Almond Butter Croissant"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-[#1C130E]">Almond Butter Croissant</h4>
                  <span className="text-sm font-extrabold text-[#D9531E]">₹240</span>
                </div>
                <p className="text-xs text-stone-500 line-clamp-2">
                  Twice-baked butter croissant filled with roasted California almond frangipane.
                </p>
              </div>
            </div>

            {/* Item 3 */}
            <div className="rounded-2xl border border-[#E8DED1] overflow-hidden bg-white shadow-xs hover:shadow-md transition">
              <div className="relative aspect-video w-full bg-stone-100">
                <Image
                  src="/images/menu/citrus-cold-brew.webp"
                  alt="Citrus Orange Cold Brew"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-[#1C130E]">Citrus Orange Cold Brew</h4>
                  <span className="text-sm font-extrabold text-[#D9531E]">₹290</span>
                </div>
                <p className="text-xs text-stone-500 line-clamp-2">
                  Slow-steeped cold brew layered over fresh Valencia orange juice with candied zest.
                </p>
              </div>
            </div>

            {/* Item 4 */}
            <div className="rounded-2xl border border-[#E8DED1] overflow-hidden bg-white shadow-xs hover:shadow-md transition">
              <div className="relative aspect-video w-full bg-stone-100">
                <Image
                  src="/images/menu/paneer-sandwich.webp"
                  alt="Amritsari Paneer Tikka Toastie"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-[#1C130E]">Paneer Tikka Toastie</h4>
                  <span className="text-sm font-extrabold text-[#D9531E]">₹220</span>
                </div>
                <p className="text-xs text-stone-500 line-clamp-2">
                  Char-grilled cottage cheese in Punjabi spiced marinade with mint chutney in artisanal bread.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture, Security & Production Deployment */}
      <section id="architecture" className="py-20 bg-[#FAF7F2]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 space-y-12">
          <div className="rounded-3xl bg-[#1C130E] text-white p-8 sm:p-12 border border-[#3D251A] space-y-8 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#C89242]">
                  Enterprise Core
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold font-serif mt-1">
                  Production-Ready Cloud Architecture
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-xs font-semibold text-emerald-400 border border-white/10">
                <ShieldCheck className="h-4 w-4" />
                <span>Zero Vulnerabilities • Full Multi-Tenant Isolation</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-stone-300">
              <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#D9531E]" />
                  Authoritative Pricing
                </h4>
                <p className="text-stone-400 leading-relaxed">
                  Cart totals and items are verified against the authoritative database. The client cannot forge or alter product prices, preventing payment tampering.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#C89242]" />
                  Multi-Tenant Database
                </h4>
                <p className="text-stone-400 leading-relaxed">
                  Built to scale with Cloudflare D1 / Neon Serverless Postgres. Every catalog, category, and order is partitioned strictly by `cafe_id`.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-400" />
                  Role-Based Access Control
                </h4>
                <p className="text-stone-400 leading-relaxed">
                  HMAC-SHA256 signed session cookies with 100,000 iteration PBKDF2 hashing. Strict role verification on every mutation and admin view.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E8DED1] bg-white py-10 text-xs text-stone-600">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-[#D9531E] flex items-center justify-center font-bold text-white text-sm">
              <Coffee className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-[#1C130E]">CafeOS Ecosystem</p>
              <p className="text-[11px] text-stone-500">Crafted for specialty cafés and bakehouses in India.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-semibold">
            <Link href="/cafe/kurali-chai-bakehouse" className="hover:text-[#D9531E] transition">
              Customer Storefront
            </Link>
            <Link href="/account" className="hover:text-[#D9531E] transition">
              Customer PWA
            </Link>
            <Link href="/reception" className="hover:text-[#D9531E] transition">
              Reception POS
            </Link>
            <Link href="/dashboard" className="hover:text-[#D9531E] transition">
              Owner Dashboard
            </Link>
            <Link href="/staff-login" className="hover:text-[#D9531E] transition">
              Staff Portal
            </Link>
          </div>

          <p className="text-stone-500">© 2026 CafeOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
