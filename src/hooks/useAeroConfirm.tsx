import { useState, useCallback, ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  resolve: ((value: boolean) => void) | null;
}

const INITIAL_STATE: ConfirmState = {
  open: false,
  title: 'Confirm',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  variant: 'default',
  resolve: null,
};

/**
 * useAeroConfirm — themed replacement for window.confirm()
 *
 * Usage:
 * ```tsx
 * const { confirm, ConfirmDialog } = useAeroConfirm();
 *
 * // In event handlers:
 * const ok = await confirm('Delete this chat?', 'Delete Chat');
 * if (ok) deleteChat();
 *
 * // In JSX (render once, anywhere in the component):
 * {ConfirmDialog}
 * ```
 */
export function useAeroConfirm() {
  const [state, setState] = useState<ConfirmState>(INITIAL_STATE);

  const confirm = useCallback(
    (
      message: string,
      title?: string,
      options?: { confirmLabel?: string; cancelLabel?: string; variant?: 'danger' | 'default' }
    ): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        setState({
          open: true,
          title: title ?? 'Confirm',
          message,
          confirmLabel: options?.confirmLabel ?? (options?.variant === 'danger' ? 'Delete' : 'Confirm'),
          cancelLabel: options?.cancelLabel ?? 'Cancel',
          variant: options?.variant ?? 'default',
          resolve,
        });
      });
    },
    []
  );

  const handleAction = useCallback(() => {
    setState((prev) => {
      prev.resolve?.(true);
      return { ...INITIAL_STATE };
    });
  }, []);

  const handleCancel = useCallback(() => {
    setState((prev) => {
      prev.resolve?.(false);
      return { ...INITIAL_STATE };
    });
  }, []);

  const isDanger = state.variant === 'danger';

  const ConfirmDialog: ReactNode = (
    <AlertDialog open={state.open} onOpenChange={(open) => { if (!open) handleCancel(); }}>
      <AlertDialogPortal>
        <AlertDialogOverlay className="bg-black/70 backdrop-blur-sm" />
        <AlertDialogContent
          className="max-w-sm border border-emerald-500/20 bg-slate-950/95 backdrop-blur-xl shadow-[0_0_60px_rgba(16,185,129,0.08)] rounded-2xl"
        >
          <AlertDialogHeader className="items-center text-center space-y-3 pb-1">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
              isDanger 
                ? 'bg-red-500/10 border border-red-500/30' 
                : 'bg-emerald-500/10 border border-emerald-500/30'
            }`}>
              <AlertTriangle className={`w-5 h-5 ${isDanger ? 'text-red-400' : 'text-emerald-400'}`} />
            </div>
            <AlertDialogTitle className="text-base font-semibold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {state.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-400 leading-relaxed">
              {state.message}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex-row gap-2 pt-2">
            <AlertDialogCancel
              onClick={handleCancel}
              className="flex-1 bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700/80 hover:text-white rounded-xl h-10 text-sm font-medium transition-all"
            >
              {state.cancelLabel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              className={`flex-1 rounded-xl h-10 text-sm font-semibold text-white transition-all ${
                isDanger
                  ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
              }`}
            >
              {state.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialog>
  );

  return { confirm, ConfirmDialog };
}
