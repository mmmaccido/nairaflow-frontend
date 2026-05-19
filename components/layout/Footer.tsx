import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-8 rounded-full bg-green-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm font-sora">N</span>
              </div>
              <span className="text-white font-semibold text-lg font-sora">NairaFlow</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Fast, secure money transfers from Nigeria to the world.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-white font-medium text-sm mb-4">Product</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/how-it-works" className="hover:text-white transition-colors">How it works</Link></li>
              <li><Link href="/currencies" className="hover:text-white transition-colors">Currencies</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-medium text-sm mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-medium text-sm mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
              <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-slate-500">
          <span>© 2025 NairaFlow Ltd. CBN Licensed Bureau De Change.</span>
          <span>Cash delivery: Lagos · Abuja · Port Harcourt · Kano</span>
        </div>
      </div>
    </footer>
  )
}
