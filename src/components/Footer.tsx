

const Footer = () => {
  const quickLinks = [
    { name: "Home", href: "#home" },
    { name: "About", href: "#about" },
    { name: "Tools", href: "#tools" },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <footer className="bg-gradient-to-t from-black via-slate-900 to-slate-900/50 backdrop-blur-lg border-t border-cyan-400/20 py-12 relative overflow-hidden">
      {/* Decorative orbit line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />

      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img 
              src="/aerorbis-logo.jpeg" 
              alt="AERORBIS" 
              className="w-8 h-8 rounded-sm drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]"
            />
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white tracking-wide">AERORBIS</span>
              <span className="text-xs text-cyan-400">
                Where Aerospace Minds Connect
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex gap-8">
            {quickLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-gray-400 hover:text-cyan-400 transition-colors drop-shadow-[0_0_5px_rgba(34,211,238,0.3)]"
              >
                {link.name}
              </a>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center mt-8 pt-8 border-t border-cyan-400/20">
          <p className="text-gray-400 text-sm">
            © 2026 AERORBIS. Where Aerospace Minds Connect.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
