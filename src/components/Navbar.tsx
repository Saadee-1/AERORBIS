import { useState, useEffect, useRef } from "react";
import { Menu, X, Home, Wrench, BookOpen, FlaskConical, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import ProfileMenu from "./ProfileMenu";
import AudioToggle from "./AudioToggle";
import ThemeToggle from "./ThemeToggle";
import aerorbisLogo from "@/assets/aerorbis-logo-refined.png";

const menuItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Tools", href: "/tools", icon: Wrench },
  { name: "Learn", href: "/learn", icon: BookOpen },
  { name: "Research", href: "/research", icon: FlaskConical },
  { name: "Community", href: "/community", icon: Users },
];

/* ── Single dock item with magnification ── */
function DockItem({
  item,
  isActive,
  mouseX,
}: {
  item: (typeof menuItems)[number];
  isActive: boolean;
  mouseX: ReturnType<typeof useMotionValue<number>>;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const Icon = item.icon;

  // distance from mouse to center of this item
  const distance = useTransform(mouseX, (val: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return 200;
    return val - (rect.left + rect.width / 2);
  });

  // magnification: items within ~80px get scaled
  // Buttery smooth spring: lower stiffness + higher damping = silky macOS feel
  const scaleRaw = useTransform(distance, [-100, 0, 100], [1, 1.3, 1]);
  const scale = useSpring(scaleRaw, { stiffness: 170, damping: 22, mass: 0.4 });

  const yRaw = useTransform(distance, [-100, 0, 100], [0, -6, 0]);
  const y = useSpring(yRaw, { stiffness: 170, damping: 22, mass: 0.4 });

  return (
    <motion.div style={{ scale, y }} className="relative flex flex-col items-center">
      <Link
        ref={ref}
        to={item.href}
        className={`relative flex flex-col items-center gap-0 px-2 py-1 rounded-lg transition-colors duration-200 group ${
          isActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {/* Glow background on active */}
        {isActive && (
          <motion.span
            layoutId="dock-active"
            className="absolute inset-0 rounded-lg bg-primary/10 shadow-[0_0_12px_hsl(160_84%_39%/0.12)]"
            transition={{ type: "spring", stiffness: 200, damping: 28, mass: 0.8 }}
          />
        )}

        {/* Icon with bounce on hover */}
        <span className="relative z-10 p-1 rounded-md bg-card/50 backdrop-blur-sm border border-border/20 shadow-sm group-hover:shadow-[0_0_8px_hsl(160_84%_39%/0.15)] transition-shadow duration-300">
          <Icon size={14} strokeWidth={1.8} />
        </span>

        {/* Label */}
        <span className="relative z-10 text-[8px] font-semibold uppercase tracking-[0.15em] leading-none">
          {item.name}
        </span>
      </Link>

      {/* Active indicator dot */}
      {isActive && (
        <motion.span
          layoutId="dock-dot"
          className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_6px_hsl(160_84%_39%/0.6)]"
          transition={{ type: "spring", stiffness: 200, damping: 28, mass: 0.8 }}
        />
      )}
    </motion.div>
  );
}

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const mouseX = useMotionValue(-200);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
        scrolled
          ? "bg-popover/95 backdrop-blur-2xl border-b border-primary/20 shadow-[0_4px_30px_hsl(160_84%_39%/0.08)]"
          : "bg-transparent backdrop-blur-md border-b border-border/10"
      }`}
    >
      {/* Top accent line */}
      <div
        className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent transition-opacity duration-500 ${
          scrolled ? "opacity-100" : "opacity-0"
        }`}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <img
              src={aerorbisLogo}
              alt="AERORBIS"
              className="w-7 h-7 sm:w-8 sm:h-8"
            />
            <span className="hidden sm:inline text-sm font-bold text-foreground tracking-[0.2em] font-[Orbitron] uppercase">
              AERORBIS
            </span>
          </Link>

          {/* ── Desktop Dock ── */}
          <div
            className="hidden lg:flex items-end gap-0.5 px-3 py-1.5 rounded-2xl bg-card/40 backdrop-blur-xl border border-border/20 shadow-[0_2px_20px_hsl(0_0%_0%/0.15)]"
            onMouseMove={(e) => mouseX.set(e.clientX)}
            onMouseLeave={() => mouseX.set(-200)}
          >
            {menuItems.map((item) => (
              <DockItem
                key={item.name}
                item={item}
                isActive={location.pathname === item.href}
                mouseX={mouseX}
              />
            ))}
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

          {/* Mobile toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-muted-foreground hover:text-foreground transition-colors p-2 -mr-2"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="md:hidden overflow-hidden border-t border-border/20"
            >
              <div className="py-3 space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 text-sm py-2.5 px-3 rounded-md transition-all duration-200 uppercase tracking-wider font-medium ${
                        location.pathname === item.href
                          ? "text-primary bg-primary/10"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon size={16} />
                      {item.name}
                    </Link>
                  );
                })}
                <div className="pt-3 border-t border-border/20 flex items-center justify-between">
                  <ThemeToggle />
                  <AudioToggle />
                  <ProfileMenu />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navbar;
