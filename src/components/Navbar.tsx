import { useState, useEffect } from "react";
import { Menu, X, Rocket } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import ProfileMenu from "./ProfileMenu";
import AudioToggle from "./AudioToggle";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const menuItems = [
    { name: "Home", href: "/" },
    { name: "Learn", href: "/learn" },
    { name: "Research", href: "/research" },
    { name: "Tools", href: "/tools" },
    { name: "Community", href: "/community" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-slate-900/50 backdrop-blur-lg border-b border-cyan-400/20" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <Rocket className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)] transition-transform group-hover:rotate-12" />
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-white">AeroVerse</span>
              <span className="text-xs text-cyan-400 hidden sm:block">
                Discover. Design. Defy Gravity.
              </span>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-8">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`text-gray-300 hover:text-cyan-400 transition-all duration-200 font-medium ${
                  location.pathname === item.href 
                    ? "text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,1)] font-bold" 
                    : ""
                }`}
              >
                {item.name}
              </Link>
            ))}
            <AudioToggle />
            <Link to="/dashboard">
              <Button className="bg-gradient-to-r from-cyan-400 to-blue-400 text-black font-bold uppercase tracking-wide shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] transition-all duration-300">
                Join Now
              </Button>
            </Link>
            <ProfileMenu />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden text-foreground hover:text-primary transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden pb-4"
            >
              <div className="flex flex-col space-y-4">
                {menuItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`text-gray-300 hover:text-cyan-400 transition-all duration-200 font-medium py-2 ${
                      location.pathname === item.href 
                        ? "text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,1)] font-bold" 
                        : ""
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
                <Link to="/dashboard" className="w-full">
                  <Button className="bg-gradient-to-r from-cyan-400 to-blue-400 text-black w-full font-bold uppercase tracking-wide shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                    Join Now
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default Navbar;
