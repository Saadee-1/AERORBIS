import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Mail, Lock, User, Zap } from "lucide-react";

const OrbitalRing = ({ radius, duration, delay, clockwise = true }: {
  radius: number; duration: number; delay: number; clockwise?: boolean;
}) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{
      width: radius * 2,
      height: radius * 2,
      top: "50%",
      left: "50%",
      marginLeft: -radius,
      marginTop: -radius,
      border: "1px solid rgba(0,212,170,0.35)",
    }}
    animate={{ rotate: clockwise ? 360 : -360 }}
    transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
  >
    <div
      className="absolute rounded-full"
      style={{
        width: 6,
        height: 6,
        top: 0,
        left: "50%",
        marginLeft: -3,
        marginTop: -3,
        background: "rgba(0,212,170,0.9)",
        boxShadow: "0 0 10px rgba(0,212,170,0.8), 0 0 20px rgba(0,212,170,0.4)",
      }}
    />
  </motion.div>
);

const WarpStreaks = ({ active }: { active: boolean }) => (
  <AnimatePresence>
    {active && (
      <motion.div className="fixed inset-0 z-40 pointer-events-none overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              height: 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: "rgba(0,212,170,0.6)",
              transformOrigin: "left center",
              rotate: `${Math.random() * 30 - 15}deg`,
            }}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: `${80 + Math.random() * 180}px`, opacity: [0, 1, 0] }}
            transition={{ duration: 0.45, delay: i * 0.015 }}
          />
        ))}
      </motion.div>
    )}
  </AnimatePresence>
);

const GoogleIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const inputStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const StyledInput = ({ icon: Icon, ...props }: { icon: any } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="relative group">
    <Icon className="absolute left-3 top-3.5 w-4 h-4 text-white/25 group-focus-within:text-primary transition-colors duration-300 z-10" />
    <input
      {...props}
      className="w-full pl-10 pr-4 py-3 rounded-lg text-sm text-white placeholder-white/25 outline-none transition-all duration-300"
      style={inputStyle}
      onFocus={e => {
        e.target.style.borderColor = "rgba(0,212,170,0.5)";
        e.target.style.boxShadow = "0 0 20px rgba(0,212,170,0.08), inset 0 0 10px rgba(0,212,170,0.03)";
      }}
      onBlur={e => {
        e.target.style.borderColor = "rgba(255,255,255,0.08)";
        e.target.style.boxShadow = "none";
      }}
    />
  </div>
);

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [warping, setWarping] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const triggerWarp = (cb: () => void) => {
    setWarping(true);
    setTimeout(() => { setWarping(false); cb(); }, 480);
  };

  const handleToggle = () => triggerWarp(() => setIsLogin(prev => !prev));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) toast.error(error.message);
    } else {
      if (!username.trim()) { toast.error("Username is required"); setLoading(false); return; }
      const { error } = await signUp(email, password, username);
      if (error) toast.error(error.message);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) toast.error(error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 relative overflow-hidden">
      <WarpStreaks active={warping} />

      {/* Background glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(0,212,170,0.05) 0%, transparent 70%)",
          top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, type: "spring", stiffness: 120, damping: 20 }}
        className="w-full max-w-md relative"
      >
        {/* Orbital rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <OrbitalRing radius={230} duration={22} delay={0} />
          <OrbitalRing radius={275} duration={35} delay={-12} clockwise={false} />
        </div>

        {/* Card */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: "rgba(8, 12, 28, 0.88)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(0,212,170,0.15)",
            boxShadow: "0 0 60px rgba(0,212,170,0.06), 0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <div className="p-8">
            {/* Floating icon */}
            <motion.div
              className="flex justify-center mb-6"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{
                  background: "rgba(0,212,170,0.08)",
                  border: "1px solid rgba(0,212,170,0.25)",
                  boxShadow: "0 0 25px rgba(0,212,170,0.12)",
                }}
              >
                <Zap className="w-7 h-7 text-primary" />
              </div>
            </motion.div>

            {/* Animated form content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? "login" : "signup"}
                initial={{ opacity: 0, scale: 0.85, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.85, filter: "blur(8px)" }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold font-[Orbitron] text-white mb-1.5">
                    {isLogin ? "Welcome Back" : "Join AERORBIS"}
                  </h1>
                  <p className="text-xs text-white/35 tracking-wider">
                    {isLogin ? "Sign in to your account" : "Create your account to join the community"}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {!isLogin && (
                    <StyledInput
                      icon={User}
                      placeholder="Username"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                    />
                  )}
                  <StyledInput
                    icon={Mail}
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                  <StyledInput
                    icon={Lock}
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />

                  <motion.button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-lg font-bold text-xs uppercase tracking-[0.2em] font-[Orbitron] mt-1"
                    style={{
                      background: loading
                        ? "rgba(0,212,170,0.4)"
                        : "linear-gradient(135deg, rgba(0,212,170,1), rgba(0,160,120,1))",
                      color: "#060d1a",
                      boxShadow: loading ? "none" : "0 0 25px rgba(0,212,170,0.35)",
                    }}
                    whileHover={!loading ? { scale: 1.02, boxShadow: "0 0 40px rgba(0,212,170,0.55)" } : {}}
                    whileTap={!loading ? { scale: 0.98 } : {}}
                  >
                    {loading ? "Processing..." : isLogin ? "Launch" : "Initialize"}
                  </motion.button>
                </form>

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-white/8" />
                  <span className="text-[10px] text-white/25 uppercase tracking-widest">or</span>
                  <div className="flex-1 h-px bg-white/8" />
                </div>

                <motion.button
                  onClick={handleGoogle}
                  disabled={loading}
                  className="w-full py-3 rounded-lg flex items-center justify-center gap-2.5 text-sm font-medium transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.75)",
                  }}
                  whileHover={{ background: "rgba(255,255,255,0.09)", scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <GoogleIcon />
                  Continue with Google
                </motion.button>

                <div className="mt-5 text-center">
                  <button
                    onClick={handleToggle}
                    className="text-[11px] text-primary/55 hover:text-primary transition-colors duration-200 uppercase tracking-widest"
                  >
                    {isLogin ? "New to AERORBIS? Create account" : "Already have an account? Sign in"}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;