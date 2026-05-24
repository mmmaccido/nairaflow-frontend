import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-ink text-muted-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-8 rounded-lg bg-emerald flex items-center justify-center">
                <span className="text-bone font-bold text-sm font-display">N</span>
              </div>
              <span className="text-bone font-semibold text-lg font-display">NairaFlow</span>
            </div>
            <p className="text-sm text-muted-dark leading-relaxed">
              Fast, secure money transfers from Nigeria to the world.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-bone font-medium text-sm mb-4">Product</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/pricing" className="hover:text-bone transition-colors">Pricing</Link></li>
              <li><Link href="/how-it-works" className="hover:text-bone transition-colors">How it works</Link></li>
              <li><Link href="/currencies" className="hover:text-bone transition-colors">Currencies</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-bone font-medium text-sm mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-bone transition-colors">About</Link></li>
              <li><Link href="/contact" className="hover:text-bone transition-colors">Contact</Link></li>
              <li><Link href="/blog" className="hover:text-bone transition-colors">Blog</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-bone font-medium text-sm mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/terms" className="hover:text-bone transition-colors">Terms</Link></li>
              <li><Link href="/privacy" className="hover:text-bone transition-colors">Privacy</Link></li>
              <li><Link href="/faq" className="hover:text-bone transition-colors">FAQ</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-ink-line pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-muted-dark">
          <span>© 2025 NairaFlow Ltd. CBN Licensed Bureau De Change.</span>
          <span>Cash delivery: Lagos · Abuja · Port Harcourt · Kano</span>
        </div>
      </div>
    </footer>
  )
}