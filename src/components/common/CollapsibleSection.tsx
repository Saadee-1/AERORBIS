/**
 * Compact Collapsible Section Component
 * With localStorage persistence and smooth transitions
 */

"use client";

import { useState, useEffect, ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  storageKey?: string;
  compact?: boolean;
  icon?: ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  storageKey,
  compact = false,
  icon,
  className = '',
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(() => {
    if (storageKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`collapsible-${storageKey}`);
      if (stored !== null) {
        return stored === 'true';
      }
    }
    return defaultOpen;
  });

  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(`collapsible-${storageKey}`, String(isOpen));
    }
  }, [isOpen, storageKey]);

  const toggle = () => setIsOpen(!isOpen);

  return (
    <div className={`border border-cyan-400/20 rounded-lg bg-slate-800/30 ${className}`}>
      <button
        onClick={toggle}
        className={`w-full flex items-center justify-between p-${compact ? '2' : '3'} hover:bg-slate-700/30 transition-colors rounded-t-lg ${
          isOpen ? 'rounded-b-none' : 'rounded-b-lg'
        }`}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-cyan-400">{icon}</span>}
          <h3 className={`text-${compact ? 'sm' : 'base'} font-semibold text-white`}>
            {title}
          </h3>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-cyan-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-cyan-400" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`p-${compact ? '2' : '4'} pt-${compact ? '2' : '4'}`}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Collapsible Section Group with "Expand All / Collapse All"
 */
interface CollapsibleGroupProps {
  children: ReactNode;
  defaultAllOpen?: boolean;
  storagePrefix?: string;
}

export function CollapsibleGroup({
  children,
  defaultAllOpen = true,
  storagePrefix = 'group',
}: CollapsibleGroupProps) {
  const [allOpen, setAllOpen] = useState(defaultAllOpen);

  const expandAll = () => {
    setAllOpen(true);
    if (typeof window !== 'undefined') {
      // Find all collapsible sections with this prefix and expand them
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(`collapsible-${storagePrefix}-`)) {
          localStorage.setItem(key, 'true');
        }
      });
      window.dispatchEvent(new Event('storage'));
    }
  };

  const collapseAll = () => {
    setAllOpen(false);
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(`collapsible-${storagePrefix}-`)) {
          localStorage.setItem(key, 'false');
        }
      });
      window.dispatchEvent(new Event('storage'));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 justify-end mb-2">
        <button
          onClick={expandAll}
          className="text-xs px-2 py-1 text-cyan-400 hover:bg-cyan-400/10 rounded border border-cyan-400/30"
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          className="text-xs px-2 py-1 text-cyan-400 hover:bg-cyan-400/10 rounded border border-cyan-400/30"
        >
          Collapse All
        </button>
      </div>
      {children}
    </div>
  );
}
