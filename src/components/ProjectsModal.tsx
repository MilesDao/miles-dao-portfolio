import { motion } from "motion/react";
import { X, ArrowUpRight } from "lucide-react";
import { Project } from "../types";

interface ProjectsModalProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
}

export default function ProjectsModal({ id, isOpen, onClose, projects }: ProjectsModalProps) {
  if (!isOpen) return null;

  return (
    <div id={id} className="fixed inset-0 z-50 flex items-center justify-end font-sans pr-0 md:pr-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-neutral-950 cursor-pointer"
      />

      {/* Slide-out Panel */}
      <motion.div
        initial={{ x: "100%", opacity: 0.9 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0.9 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-2xl h-screen md:h-[96vh] md:my-[2vh] md:rounded-l-2xl bg-[#ebeae4] border-l-2 border-neutral-950 p-6 md:p-12 shadow-2xl flex flex-col justify-between overflow-y-auto"
      >
        {/* Header */}
        <div>
          <div className="flex justify-between items-start border-b border-neutral-900 pb-6 mb-8">
            <div>
              <p className="font-mono text-xs tracking-widest text-neutral-500 uppercase mb-1">
                EX—26 // PORTFOLIO SERIES
              </p>
              <h2 className="font-display text-3xl font-black tracking-tight text-neutral-900">
                CORE WORK INDEX
              </h2>
            </div>
            <button
              id="close-projects-btn"
              onClick={onClose}
              className="p-2 border border-neutral-900 rounded-full hover:bg-neutral-950 hover:text-[#ebeae4] transition-colors duration-200"
            >
              <X size={18} />
            </button>
          </div>

          {/* Project List */}
          <div className="space-y-10">
            {projects.length === 0 ? (
              <p className="font-mono text-xs text-neutral-500 py-12 text-center">
                NO PROJECTS REGISTERED IN PERSISTENT VECTOR.
              </p>
            ) : (
              projects.map((proj, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={proj.id}
                className="group border-b border-neutral-300 pb-8 hover:border-neutral-950 transition-colors duration-300"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-xs text-neutral-500 font-bold bg-neutral-200/50 px-2 py-0.5 rounded">
                    {proj.year}
                  </span>
                  <span className="font-mono text-[10px] tracking-wider uppercase text-neutral-400">
                    {proj.category}
                  </span>
                </div>

                <h3 className="font-display text-xl font-bold tracking-tight text-neutral-900 group-hover:translate-x-1 duration-200 transition-transform">
                  {proj.title}
                </h3>

                {proj.image && (
                  <div className="my-4 overflow-hidden rounded border border-neutral-300">
                    <img 
                      src={proj.image} 
                      alt={proj.title} 
                      className="w-full max-h-64 object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}

                <p className="text-neutral-600 text-sm mt-2 leading-relaxed max-w-xl">
                  {proj.description}
                </p>

                <div className="flex flex-wrap gap-2 mt-4">
                  {proj.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[10px] text-neutral-500 border border-neutral-300 rounded px-2 py-0.5 hover:border-neutral-900 transition-colors"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex justify-end">
                  <a
                    href={proj.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs font-bold text-neutral-800 hover:text-neutral-950 hover:underline cursor-pointer"
                  >
                    DEPLOYED APP <ArrowUpRight size={14} />
                  </a>
                </div>
              </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-dashed border-neutral-400 flex justify-between items-center text-xs font-mono text-neutral-500">
          <span>PORTFOLIO CODEBASE OVERVIEW</span>
          <span>MD—MUG—SERIES</span>
        </div>
      </motion.div>
    </div>
  );
}
