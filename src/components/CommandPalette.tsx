import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Terminal, ArrowUpRight, ShieldCheck, Book, Cpu } from "lucide-react";

interface CommandPaletteProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  onAction: (actionKey: string) => void;
}

interface CommandItem {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  shortcut: string;
}

export default function CommandPalette({ id, isOpen, onClose, onAction }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle escape key, up/down arrows, and enter key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          handleTrigger(filteredCommands[selectedIndex].key);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, query]);

  const commands: CommandItem[] = [
    {
      key: "about",
      title: "LOAD TECHNICAL SPEC SHEET",
      subtitle: "Review Miles Dao's identity matrix and engine capabilities",
      icon: <Cpu size={14} />,
      shortcut: "TAB"
    },
    {
      key: "work",
      title: "VIEW PROJECTS INDEX",
      subtitle: "Browse custom front-end assemblies & technical sandbox systems",
      icon: <Terminal size={14} />,
      shortcut: "↵"
    },
    {
      key: "blog",
      title: "ACCESS TECHNICAL JOURNAL",
      subtitle: "Read architectural records and computational logs",
      icon: <Book size={14} />,
      shortcut: "B"
    }
  ];

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  const handleTrigger = (key: string) => {
    onAction(key);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div id={id} className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 font-sans">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm cursor-pointer"
      />

      {/* Palette Body */}
      <motion.div
        initial={{ y: -20, scale: 0.98, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: -20, scale: 0.98, opacity: 0 }}
        className="relative w-full max-w-lg bg-[#ebeae4] border-2 border-neutral-950 rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Search Bar */}
        <div className="flex items-center gap-3 px-4 border-b-2 border-neutral-950 bg-neutral-200/50">
          <Search size={18} className="text-neutral-500" />
          <input
            id="search-palette-input"
            ref={inputRef}
            type="text"
            placeholder="Type a command or filter index..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full h-12 bg-transparent text-neutral-900 border-none outline-none focus:ring-0 placeholder-neutral-400 font-mono text-xs uppercase"
          />
          <span className="font-mono text-[9px] border border-neutral-400 text-neutral-500 px-1.5 py-0.5 rounded uppercase">
            ESC
          </span>
        </div>

        {/* Command Items */}
        <div className="p-2 max-h-72 overflow-y-auto">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  id={`cmd-item-${cmd.key}`}
                  key={cmd.key}
                  onClick={() => handleTrigger(cmd.key)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? "bg-neutral-950 text-[#ebeae4]"
                      : "text-neutral-800 hover:bg-neutral-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isSelected ? "text-green-400" : "text-neutral-500"}>
                      {cmd.icon}
                    </span>
                    <div className="text-left">
                      <p className="font-mono text-[11px] font-bold tracking-wider">
                        {cmd.title}
                      </p>
                      <p
                        className={`text-[10px] leading-tight ${
                          isSelected ? "text-neutral-400" : "text-neutral-500"
                        }`}
                      >
                        {cmd.subtitle}
                      </p>
                    </div>
                  </div>

                  <span className="font-mono text-[9px] border border-neutral-400/30 px-1 py-0.5 rounded opacity-60">
                    {cmd.shortcut}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-neutral-500 font-mono text-xs uppercase flex flex-col items-center justify-center gap-2">
              <ShieldCheck size={20} className="opacity-40" />
              NO MATCHING COMMAND PATHS FOUND
            </div>
          )}
        </div>

        {/* Status Line */}
        <div className="px-4 py-2 bg-neutral-950 text-[#ebeae4] border-t border-neutral-800 flex justify-between items-center text-[10px] font-mono">
          <span className="flex items-center gap-2 text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            CONSOLE ACTIVE
          </span>
          <span className="text-neutral-500 uppercase">SYS_INDEXv26</span>
        </div>
      </motion.div>
    </div>
  );
}
