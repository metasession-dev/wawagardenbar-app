import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Twitter } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

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
    // TODO: Create these pages
    // { label: 'Help Center', href: '/help' },
    // { label: 'Terms of Service', href: '/terms' },
    // { label: 'Privacy Policy', href: '/privacy' },
  ],
  quick: [
    { label: 'Menu', href: '/menu' },
    { label: 'Orders', href: '/orders' },
    { label: 'Rewards', href: '/rewards' },
  ],
};

const socialLinks = [
  { icon: Facebook, href: 'https://facebook.com', label: 'Facebook' },
  { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
  { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
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
