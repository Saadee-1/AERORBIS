import aerorbisLogo from "@/assets/aerorbis-logo.png";

const Footer = () => {
  const quickLinks = [
    { name: "Home", href: "#home" },
    { name: "About", href: "#about" },
    { name: "Tools", href: "#tools" },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <footer className="bg-transparent backdrop-blur-sm border-t border-border/30 py-10">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img
              src={aerorbisLogo}
              alt="AERORBIS"
              className="w-8 h-8"
            />
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-foreground tracking-wide">
                AERORBIS
              </span>
              <span className="text-xs text-muted-foreground">
                Where Aerospace Minds Connect
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex gap-6">
            {quickLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center mt-8 pt-6 border-t border-border">
          <p className="text-muted-foreground text-sm">
            © 2026 AERORBIS. Where Aerospace Minds Connect.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
