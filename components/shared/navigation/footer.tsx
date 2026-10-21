import Link from 'next/link';
import Image from 'next/image';
import { Instagram } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// lucide-react has no TikTok glyph; minimal inline SVG matching the
// surrounding icons' h-5 w-5 / currentColor convention.
function TikTokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.6 5.82a4.28 4.28 0 0 1-3.77-3.77V2h-3.2v13.9a2.59 2.59 0 1 1-1.84-2.48V10.3a5.75 5.75 0 1 0 5.04 5.7v-6.96a7.5 7.5 0 0 0 4.33 1.38V7.2a4.28 4.28 0 0 1-.56-1.38Z" />
    </svg>
  );
}

const BUSINESS_ADDRESS =
  'Mikano Road, Plot 27 to 42 Westerner Industrial Ave, Warewa Town, Ifo 102109, Ogun State, Nigeria';

type FooterLink = { label: string; href: string };

const footerLinks: {
  company: FooterLink[];
  support: FooterLink[];
  quick: FooterLink[];
} = {
  company: [
    // TODO: Create these pages
    // { label: 'About Us', href: '/about' },
    // REQ-062 — /contact page now exists.
    { label: 'Contact', href: '/contact' },
    // { label: 'Careers', href: '/careers' },
  ],
  support: [
    // TODO: Create this page
    // { label: 'Help Center', href: '/help' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
  ],
  quick: [
    { label: 'Menu', href: '/menu' },
    { label: 'Orders', href: '/orders' },
    { label: 'Rewards', href: '/rewards' },
  ],
};

const socialLinks = [
  {
    icon: Instagram,
    href: 'https://instagram.com/wawagardenbar',
    label: 'Instagram',
  },
  {
    icon: TikTokIcon,
    href: 'https://tiktok.com/@wawagardenbar',
    label: 'TikTok',
  },
];

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/logo.png"
                alt="Wawa Garden Bar"
                width={40}
                height={40}
                className="h-10 w-auto"
              />
              <span className="font-bold">Wawa Garden Bar</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Delicious food and drinks delivered to your table or door.
            </p>
            <p className="text-sm text-muted-foreground">{BUSINESS_ADDRESS}</p>
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Company */}
          {footerLinks.company.length > 0 && (
            <div>
              <h3 className="mb-4 text-sm font-semibold">Company</h3>
              <ul className="space-y-2">
                {footerLinks.company.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Support */}
          {footerLinks.support.length > 0 && (
            <div>
              <h3 className="mb-4 text-sm font-semibold">Support</h3>
              <ul className="space-y-2">
                {footerLinks.support.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Quick Links</h3>
            <ul className="space-y-2">
              {footerLinks.quick.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between space-y-4 text-sm text-muted-foreground md:flex-row md:space-y-0">
          <p>
            © {new Date().getFullYear()} Wawa Garden Bar. All rights reserved.
          </p>
          <p>Made with ❤️ in Nigeria</p>
        </div>
      </div>
    </footer>
  );
}
