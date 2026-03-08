import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import ProfileMenu from "./ProfileMenu";
import AudioToggle from "./AudioToggle";
import ThemeToggle from "./ThemeToggle";
import aerorbisLogo from "@/assets/aerorbis-logo-refined.png";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const menuItems = [
    { name: "Home", href: "/" },
    { name: "Tools", href: "/tools" },
    { name: "Learn", href: "/learn" },
    { name: "Research", href: "/research" },
    { name: "Community", href: "/community" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
        scrolled
          ? "bg-popover/95 backdrop-blur-2xl border-b border-primary/20 shadow-[0_4px_30px_hsl(160_84%_39%/0.08)]"
          : "bg-transparent backdrop-blur-md border-b border-border/10"
      }`}
    >
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent transition-opacity duration-500 ${scrolled ? 'opacity-100' : 'opacity-0'}`} />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <img src={aerorbisLogo} alt="AERORBIS" className="w-7 h-7 sm:w-8 sm:h-8" />
            <span className="hidden sm:inline text-sm font-bold text-foreground tracking-[0.2em] font-[Orbitron] uppercase">AERORBIS</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`text-xs font-medium uppercase tracking-[0.15em] transition-all duration-300 px-4 py-2 rounded-md relative ${
                    isActive
                      ? "text-primary bg-primary/10 shadow-[0_0_15px_hsl(160_84%_39%/0.2)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
                  }`}
                >
                  {item.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-[1px] bg-primary/60" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right controls */}
          <div className="hidden lg:flex items-center gap-2">
            <ThemeToggle />
            <AudioToggle />
            <ProfileMenu />
          </div>

          {/* Tablet */}
          <div className="hidden md:flex lg:hidden items-center gap-2">
            {menuItems.slice(0, 4).map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`text-[10px] uppercase tracking-widest transition-all duration-300 px-2.5 py-1.5 rounded-md ${
                  location.pathname === item.href
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.name}
              </Link>
            ))}
            <ThemeToggle />
            <AudioToggle />
            <ProfileMenu />
          </div>

          {/* Mobile */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-muted-foreground hover:text-foreground transition-colors p-2 -mr-2"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-out ${
            isOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="py-3 space-y-1 border-t border-border/20">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={`block text-sm py-2.5 px-3 rounded-md transition-all duration-200 uppercase tracking-wider font-medium ${
                  location.pathname === item.href
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-3 border-t border-border/20 flex items-center justify-between">
              <ThemeToggle />
              <AudioToggle />
              <ProfileMenu />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
