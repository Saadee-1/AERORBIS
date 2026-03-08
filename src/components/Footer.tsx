import aerorbisLogo from "@/assets/aerorbis-logo-refined.png";
import { Link } from "react-router-dom";

const Footer = () => {
  const quickLinks = [
    { name: "Home", href: "/" },
    { name: "Tools", href: "/tools" },
    { name: "Learn", href: "/learn" },
    { name: "Research", href: "/research" },
    { name: "Community", href: "/community" },
  ];

  return (
    <footer className="bg-transparent border-t border-border/30 py-10 relative">
      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img src={aerorbisLogo} alt="AERORBIS" className="w-8 h-8" />
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground tracking-widest font-[Orbitron]">
                AERORBIS
              </span>
              <span className="text-xs text-primary/60 uppercase tracking-wider">
                Where Aerospace Minds Connect
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {quickLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 tracking-wide"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="text-center mt-8 pt-6 border-t border-border/20">
          <p className="text-muted-foreground/60 text-xs uppercase tracking-widest">
            © 2026 AERORBIS · All Systems Operational
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
