import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-slate-950/95 group-[.toaster]:text-slate-100 group-[.toaster]:border-emerald-500/20 group-[.toaster]:shadow-[0_0_40px_rgba(16,185,129,0.08)] group-[.toaster]:backdrop-blur-xl group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-slate-400",
          actionButton: "group-[.toast]:bg-emerald-600 group-[.toast]:text-white group-[.toast]:hover:bg-emerald-500 group-[.toast]:rounded-lg group-[.toast]:font-semibold",
          cancelButton: "group-[.toast]:bg-slate-800 group-[.toast]:text-slate-300 group-[.toast]:hover:bg-slate-700 group-[.toast]:rounded-lg",
          success: "group-[.toast]:border-emerald-500/40 group-[.toast]:bg-slate-950/95",
          error: "group-[.toast]:border-red-500/40 group-[.toast]:bg-slate-950/95",
          info: "group-[.toast]:border-sky-500/40 group-[.toast]:bg-slate-950/95",
          warning: "group-[.toast]:border-amber-500/40 group-[.toast]:bg-slate-950/95",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
