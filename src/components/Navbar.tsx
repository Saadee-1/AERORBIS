import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import ProfileMenu from "./ProfileMenu";
import AudioToggle from "./AudioToggle";
import aerorbisLogo from "@/assets/aerorbis-logo.png";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ease-out ${
        scrolled 
          ? "bg-popover backdrop-blur-md border-b border-border/50" 
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-14 sm:h-16">
          {/* Desktop Navigation - Centered with Brand */}
          <div className="hidden lg:flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 text-base font-semibold text-foreground tracking-wide">
              <img src={aerorbisLogo} alt="AERORBIS" className="w-7 h-7" />
              <span>AERORBIS</span>
            </Link>
            
            <div className="flex items-center gap-6">
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`text-sm transition-colors duration-150 ${
                    location.pathname === item.href
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              <AudioToggle />
              <ProfileMenu />
            </div>
          </div>

          {/* Tablet Navigation - Centered */}
          <div className="hidden md:flex lg:hidden items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <img src={aerorbisLogo} alt="AERORBIS" className="w-6 h-6" />
            </Link>
            {menuItems.slice(0, 4).map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`text-xs transition-colors duration-150 ${
                  location.pathname === item.href
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.name}
              </Link>
            ))}
            <AudioToggle />
            <ProfileMenu />
          </div>

          {/* Mobile - Brand + Menu Button */}
          <div className="md:hidden flex items-center justify-between w-full">
            <Link to="/" className="flex items-center gap-2 text-base font-semibold text-foreground">
              <img src={aerorbisLogo} alt="AERORBIS" className="w-7 h-7" />
              <span>AERORBIS</span>
            </Link>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-muted-foreground hover:text-foreground transition-colors duration-150 p-2 -mr-2"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu - Full Width Overlay */}
        <div 
          className={`md:hidden overflow-hidden transition-all duration-200 ease-out ${
            isOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="py-3 space-y-1 border-t border-border/30">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={`block text-sm py-2.5 px-1 transition-colors duration-150 ${
                  location.pathname === item.href
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-3 border-t border-border/30 flex items-center justify-between">
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
