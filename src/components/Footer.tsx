import Link from "next/link";
import { categories } from "@/lib/categories";
import { site } from "@/lib/site";
import { generalWhatsappUrl } from "@/lib/whatsapp";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-0 border-t border-ink/10 bg-cream pb-16 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:gap-10 sm:py-14 md:grid-cols-2 md:px-8 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-soft">
            {site.tagline}. A focused bag brand for school, college, travel and
            everyday life. Based in Karur, Tamil Nadu.
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-[11px] tracking-[0.2em] uppercase">Shop</h3>
          <ul className="space-y-2 text-sm">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/categories/${c.slug}`} className="hover:text-camel-dark">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-[11px] tracking-[0.2em] uppercase">Business</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/wholesale" className="hover:text-camel-dark">
                Wholesale
              </Link>
            </li>
            <li>
              <Link href="/dealers" className="hover:text-camel-dark">
                Become a Dealer
              </Link>
            </li>
            <li>
              <Link href="/catalogue" className="hover:text-camel-dark">
                Download Catalogue
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-[11px] tracking-[0.2em] uppercase">Company</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/about" className="hover:text-camel-dark">
                About Dandy
              </Link>
            </li>
            <li>
              <Link href="/manufacturing" className="hover:text-camel-dark">
                Manufacturing
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-camel-dark">
                Contact
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-[11px] tracking-[0.2em] uppercase">Support</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/faq" className="hover:text-camel-dark">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/shipping" className="hover:text-camel-dark">
                Shipping
              </Link>
            </li>
            <li>
              <Link href="/returns" className="hover:text-camel-dark">
                Returns
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-camel-dark">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-camel-dark">
                Terms
              </Link>
            </li>
          </ul>
          <h3 className="mt-6 mb-3 text-[11px] tracking-[0.2em] uppercase">Contact</h3>
          <p className="text-sm">{site.contact.location}</p>
          <p className="text-sm">{site.contact.phoneDisplay}</p>
          <p className="text-sm">{site.contact.email}</p>
          <p className="mt-2 text-xs text-ink-soft">GSTIN {site.contact.gstin}</p>
          <div className="mt-4 flex gap-4 text-sm">
            {site.instagram ? (
              <a href={site.instagram} target="_blank" rel="noreferrer">
                Instagram
              </a>
            ) : null}
            {site.facebook ? (
              <a href={site.facebook} target="_blank" rel="noreferrer">
                Facebook
              </a>
            ) : null}
            <a href={generalWhatsappUrl()} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-ink/10 px-4 py-4 text-center text-xs text-ink-soft">
        © {new Date().getFullYear()} DANDY. {site.tagline}.
      </div>
    </footer>
  );
}
