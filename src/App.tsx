import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Asterisk, ArrowUpRight, Search, Mail, Cpu, ChevronRight, Terminal, Calendar } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, useGSAP);

import WireframeSphere from "./components/WireframeSphere";
import Barcode from "./components/Barcode";
import CommandPalette from "./components/CommandPalette";
import PortraitWithKeypoints from "./components/PortraitWithKeypoints";
import AdminModal from "./components/AdminModal";
import BlogEditor from "./components/BlogEditor";
import { getProjects, getBlogs, getCV, getEducationExperience, saveBlog } from "./firebase";

const getBlogPreview = (content: string): string => {
  if (!content) return "NO CONTENT";
  if (content.trim().startsWith("[")) {
    try {
      const blocks = JSON.parse(content);
      if (Array.isArray(blocks)) {
        return blocks.slice(0, 3).map((b: any) => {
          const text = b.content || "";
          return text.replace(/<[^>]*>/g, "").trim();
        }).filter(Boolean).join(" • ") || "NO CONTENT";
      }
    } catch {}
  }
  return content;
};
import { Project, Blog, EducationExperience } from "./types";

const base64ToBlobUrl = (base64Data: string): string => {
  const sliceSize = 512;
  const [header, base64] = base64Data.split(',');
  const mimeType = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const byteCharacters = atob(base64);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  const blob = new Blob(byteArrays, { type: mimeType });
  return URL.createObjectURL(blob);
};


export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [educationList, setEducationList] = useState<EducationExperience[]>([]);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [cvName, setCvName] = useState("");
  const [cvBlobUrl, setCvBlobUrl] = useState("");

  // Load dynamic portfolio data from Firestore / LocalStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        const [projs, blgs, cv, edu] = await Promise.all([
          getProjects(),
          getBlogs(),
          getCV(),
          getEducationExperience()
        ]);
        setProjects(projs);
        setBlogs(blgs);
        
        // Sort education list chronologically (sortOrder ascending: Dai Mo first, CMC last)
        const sortedEdu = [...edu].sort((a, b) => a.sortOrder - b.sortOrder);
        setEducationList(sortedEdu);

        if (cv && cv.fileData) {
          setCvName(cv.name);
          try {
            const blobUrl = base64ToBlobUrl(cv.fileData);
            setCvBlobUrl(blobUrl);
          } catch (e) {
            console.error("Error generating CV blob URL:", e);
            setCvBlobUrl(cv.fileData);
          }
        }
      } catch (err) {
        console.error("Error loading data:", err);
      }
    };
    loadData();
  }, [activeModal]);

  // Listen to browser forward/back buttons and load blog from query parameter
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const blogId = params.get("blog");
      if (blogId) {
        const blog = blogs.find((b) => b.id === blogId);
        if (blog) {
          setSelectedBlog(blog);
        } else {
          setSelectedBlog(null);
        }
      } else {
        setSelectedBlog(null);
      }
    };

    if (blogs.length > 0) {
      handlePopState();
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [blogs]);

  // Keep track of scroll for header styles
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // CMD + K listener for opening command palette search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setActiveModal((prev) => (prev === "search" ? null : "search"));
      } else if (e.key === "Tab" && !activeModal) {
        e.preventDefault();
        scrollToSection("about-section");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeModal]);

  // Set real-time clock indicator in UTC
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hrs = String(now.getUTCHours()).padStart(2, "0");
      const mins = String(now.getUTCMinutes()).padStart(2, "0");
      const secs = String(now.getUTCSeconds()).padStart(2, "0");
      setCurrentTime(`${hrs}:${mins}:${secs} UTC`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Lock body scroll when full-page overlay is active
  useEffect(() => {
    const isLocked = !!selectedBlog || !!editingBlog || activeModal === "admin";
    if (isLocked) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedBlog, editingBlog, activeModal]);



  // Scroll reveal animations powered by GSAP ScrollTrigger
  useGSAP(() => {
    if (projects.length === 0 && blogs.length === 0 && educationList.length === 0) return;

    // Clean up existing scroll triggers to avoid leaks when state updates
    ScrollTrigger.getAll().forEach(t => t.kill());

    const sections = gsap.utils.toArray<HTMLElement>(".reveal-section");

    sections.forEach((section) => {
      const line = section.querySelector(".expand-line");
      const texts = section.querySelectorAll(".fade-text");
      const cards = section.querySelectorAll(".stagger-card");

      const sectionTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 82%",
          toggleActions: "play none none none"
        }
      });

      if (line) {
        sectionTl.fromTo(line, 
          { scaleX: 0, transformOrigin: "left" }, 
          { scaleX: 1, duration: 1.2, ease: "power4.out" }
        );
      }

      if (texts.length > 0) {
        sectionTl.fromTo(texts, 
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, stagger: 0.04, duration: 0.5, ease: "power2.out" },
          "-=0.9"
        );
      }

      if (cards.length > 0) {
        sectionTl.fromTo(cards, 
          { autoAlpha: 0, y: 15 },
          { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.6, ease: "power3.out" },
          "-=0.7"
        );
      }
    });

    ScrollTrigger.refresh();
  }, { dependencies: [projects, blogs, educationList], scope: containerRef });

  // Snappy smooth scroll using GSAP ScrollToPlugin
  const scrollToSection = (sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (target) {
      const headerOffset = 85;
      const elementPosition = target.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;

      gsap.to(window, {
        scrollTo: { y: offsetPosition, autoKill: true },
        duration: 0.8,
        ease: "power4.out" // sharp, organic slide deceleration
      });
    }
  };

  const handleAction = (actionKey: string) => {
    if (actionKey === "work") scrollToSection("projects-section");
    else if (actionKey === "about") scrollToSection("about-section");
    else if (actionKey === "blog") scrollToSection("blogs-section");
  };




  const handleBackToPortfolio = () => {
    if (window.history.state && window.history.state.blogId) {
      window.history.back();
    } else {
      window.history.pushState(null, "", window.location.pathname);
      setSelectedBlog(null);
    }
  };



  return (
    <div ref={containerRef} className="relative min-h-screen bg-[#ebeae4] text-[#111111] overflow-x-hidden selection:bg-neutral-900 selection:text-[#ebeae4]">
      {/* Dynamic Animated Grain Overlay */}
      <div className="noise-overlay" />

      {/* ==================== MAIN PORTFOLIO PAGE ==================== */}
      <motion.div
        key="main-portfolio-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full min-h-screen flex flex-col justify-between p-4 md:p-8 lg:p-10 select-none"
      >
        {/* ==================== STICKY HEADER SECTION ==================== */}
        <header
          id="main-app-header"
          className={`sticky top-0 w-full flex justify-between items-center z-40 py-4 border-b transition-all duration-300 bg-[#ebeae4]/90 backdrop-blur-md ${
            scrolled ? "border-neutral-300/80 shadow-sm" : "border-transparent"
          }`}
        >
          {/* Top Left logo structured exactly like MUGA ZERO */}
          <div
            id="logo-brand"
            onClick={() => scrollToSection("about-section")}
            className="flex flex-col font-display font-black leading-[0.8] text-sm md:text-base cursor-pointer tracking-tight select-none hover:opacity-80 transition-opacity"
          >
            <span>MILES</span>
            <span>DAO</span>
          </div>

          {/* Central Menus with smooth scrolling navigation */}
          <nav id="meta-navigation" className="hidden md:flex items-center gap-8 lg:gap-12">
            <button
              id="nav-about"
              onClick={() => scrollToSection("about-section")}
              className="font-mono text-xs tracking-wider text-neutral-800 hover:text-neutral-950 font-medium relative group"
            >
              ABOUT
              <span className="absolute left-0 right-0 -bottom-1 h-[1px] bg-neutral-950 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-200" />
            </button>
            <button
              id="nav-work"
              onClick={() => scrollToSection("projects-section")}
              className="font-mono text-xs tracking-wider text-neutral-800 hover:text-neutral-950 font-medium relative group"
            >
              WORK
              <span className="absolute left-0 right-0 -bottom-1 h-[1px] bg-neutral-950 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-200" />
            </button>
            <button
              id="nav-blog"
              onClick={() => scrollToSection("blogs-section")}
              className="font-mono text-xs tracking-wider text-neutral-800 hover:text-neutral-950 font-medium relative group"
            >
              BLOG
              <span className="absolute left-0 right-0 -bottom-1 h-[1px] bg-neutral-950 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-200" />
            </button>
          </nav>

          {/* Right Menus with exact character mapping */}
          <div id="quick-actions" className="flex items-center gap-6 md:gap-8 lg:gap-10">
            <button
              id="action-search"
              onClick={() => setActiveModal("search")}
              className="flex items-center gap-1.5 font-mono text-xs tracking-wider text-neutral-800 hover:text-neutral-950 font-medium hover:underline"
            >
              <Search size={12} />
              SEARCH
            </button>
            <button
              id="action-admin"
              onClick={() => setActiveModal("admin")}
              className="font-mono text-xs tracking-wider text-[#ebeae4] bg-neutral-950 px-3 py-1 rounded-sm hover:bg-neutral-800 transition-all font-bold cursor-pointer"
            >
              ADMIN
            </button>
          </div>
        </header>

        {/* ==================== HERO CONTENT SECTION ==================== */}
        <main className="w-full grid grid-cols-12 gap-y-12 md:gap-8 lg:gap-16 mt-3 md:mt-4 pt-1 mb-24 pr-1">

          {/* LEFT AREA: Subtitle Paragraph & Massive MUGA ZERO styling for Miles Dao */}
          <section className="col-span-12 md:col-span-7 flex flex-col justify-start items-start text-left pt-2 md:pt-4 md:pr-4 lg:pr-8">

            {/* Top Technical subtitle header */}
            <div className="flex items-start gap-3 md:gap-4 mb-6 md:mb-8 select-none">
              {/* Outer double-line asterisk symbol rotating slowly */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                className="w-8 h-8 rounded-full border border-neutral-600 flex items-center justify-center text-neutral-900 border-dashed"
              >
                <Asterisk size={16} strokeWidth={1.5} />
              </motion.div>

              {/* Two lines exactly 22 and 20 character length variables */}
              <div className="font-mono text-[10px] md:text-xs leading-normal text-neutral-600">
                <p className="tracking-wide">YOU HAVE TO DO YOUR LIFE’S WORK</p>
                <p className="tracking-wide">WITH INTENSITY AND COMMITMENT.</p>
              </div>
            </div>

            {/* Giant Title blocks replicating heavy compressed type exactly */}
            <div
              id="giant-name-header"
              className="w-full font-display font-black text-neutral-900 leading-[0.73] uppercase tracking-[-0.08em] flex flex-col pt-2 select-none"
            >
              <span className="text-[10.5vw] md:text-[5.8rem] lg:text-[8.2rem] xl:text-[9.3rem] h-[8.8vw] md:h-[5.0rem] lg:h-[7.0rem] xl:h-[8.0rem] transform scale-y-[1.25] origin-top textured-text">
                MILES
              </span>
              <span className="text-[10.5vw] md:text-[5.8rem] lg:text-[8.2rem] xl:text-[9.3rem] h-[8.8vw] md:h-[5.0rem] lg:h-[7.0rem] xl:h-[8.2rem] transform scale-y-[1.25] origin-top textured-text">
                DAO
              </span>
            </div>

            {/* Bottom Row containing metadata & cta button on the left, and technical specs & wireframe sphere on the right */}
            <div className="w-full flex flex-col sm:flex-row items-end justify-between gap-8 mt-6 md:mt-8 mb-4 pt-4 border-t border-neutral-350">
              
              {/* Left Side: Metadata and CTA Button */}
              <div id="hero-left-metadata" className="flex flex-col items-start text-left gap-6">
                <div className="font-mono text-[11px] md:text-xs leading-relaxed text-neutral-700 space-y-0.5">
                  <p className="tracking-wide">AI ENGINEER INTERN</p>
                  <p className="tracking-wide text-neutral-500 font-bold">BUILDING INTELLIGENT SYSTEMS</p>
                  <p className="tracking-wide text-neutral-500">TURNING DATA INTO DECISIONS</p>
                </div>

                <button
                  id="cta-explore-btn"
                  onClick={() => scrollToSection("projects-section")}
                  className="group relative flex items-center gap-10 bg-neutral-950 text-[#ebeae4] hover:bg-[#ebeae4] hover:text-neutral-950 border-2 border-neutral-950 px-6 py-3.5 rounded-sm font-mono text-xs font-bold transition-all duration-300 shadow-sm cursor-pointer overflow-hidden uppercase"
                >
                  <span className="relative z-10 flex items-center gap-10">
                    EXPLORE WORK <ArrowUpRight size={14} className="group-hover:rotate-45 transition-transform duration-300" />
                  </span>
                  <span className="absolute inset-x-0 bottom-0 top-full bg-[#ebeae4] group-hover:top-0 transition-all duration-300 z-0" />
                </button>
              </div>

              {/* Right Side: Rotating 3D high precision wireframe and technical specification cards */}
              <div className="flex flex-col items-end gap-2">
                {/* Ellipsoid Sphere */}
                <div className="mr-[-10px] sm:mr-0 scale-90 origin-bottom-right">
                  <WireframeSphere />
                </div>

                {/* Badges alignment and barcode layout */}
                <div className="flex items-end justify-between gap-6 md:gap-10 pt-2 border-t border-neutral-300 select-none">
                  {/* Specs text cards */}
                  <div className="text-left font-mono text-[10px] tracking-wide text-neutral-600 space-y-0.5">
                    <div>
                      <span className="text-neutral-400">BUILT ON </span>
                      <span className="text-neutral-900 font-bold">NEXTJS.</span>
                    </div>
                    <div>
                      <span className="text-neutral-400">DEFINED BY </span>
                      <span className="text-neutral-900 font-bold">MILES DAO</span>
                    </div>
                    <div className="flex items-center gap-1 pt-0.5 font-extrabold text-[#111111]">
                      <span>{`HN-${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}`}</span>
                      <ChevronRight size={10} className="text-neutral-900" />
                    </div>
                  </div>

                  {/* Vertical detail indicator and horizontal barcode */}
                  <div className="flex flex-col items-end gap-1.5 select-none text-right">
                    <span className="font-mono text-[9px] text-neutral-400 tracking-widest uppercase bg-neutral-200 px-1 py-0.5 rounded">
                      MILES DAO™
                    </span>
                    <a href="https://www.facebook.com/milesdao13" target="_blank" rel="noopener noreferrer" title="Facebook Profile" className="hover:opacity-85 transition-opacity block w-[200px] h-[26px]">
                      <Barcode id="specs-horizontal-barcode" width={200} height={26} />
                    </a>
                  </div>
                </div>
              </div>
            </div>

          </section>

          {/* RIGHT AREA: Target frame, coordinates, and large portrait viewport */}
          <section id="hero-right-visual" className="col-span-12 md:col-span-5 flex flex-col justify-start items-end text-right h-full py-2">
            {/* Mid-Right portrait with keypoints */}
            <div className="w-full flex justify-end my-4 md:my-6">
              <PortraitWithKeypoints />
            </div>
          </section>

        </main>

        {/* ==================== ABOUT SECTION ==================== */}
        <section
          id="about-section"
          className="reveal-section w-full pt-20 pb-24 border-t border-transparent relative"
        >
          {/* Expanding border line */}
          <div className="expand-line h-[2px] bg-neutral-950 mb-12 w-full origin-left scale-x-0" />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            {/* Left side: Heading, Bio, Links */}
            <div className="md:col-span-5 flex flex-col justify-between gap-10 text-left">
              <div>
                <p className="fade-text font-mono text-xs tracking-widest text-neutral-500 uppercase mb-2 opacity-0">
                  BG—98 // HERE'S SOME INFORMATION ABOUT ME
                </p>
                <h2 className="fade-text font-display text-4xl font-black tracking-tight text-neutral-900 mb-6 uppercase opacity-0">
                  MILES DAO // SPEC
                </h2>
                <div className="fade-text border-l-4 border-neutral-950 pl-4 py-2 mb-8 opacity-0">
                  <p className="text-neutral-700 text-sm md:text-base leading-relaxed max-w-md font-medium">
                    I'm an undergraduate data scientist passionate about data and machine learning. Building insightful data solutions.
                  </p>
                </div>
              </div>

              {/* System Outbound Ports */}
              <div className="fade-text opacity-0">
                <h3 className="font-mono text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">
                  SYSTEM OUTBOUND LINK PORTS
                </h3>
                <div className="flex flex-col gap-3 max-w-sm">
                  <a
                    href="mailto:trungdao131105@gmail.com"
                    className="flex items-center gap-3 border border-neutral-900 px-4 py-3 bg-neutral-200/50 rounded hover:bg-neutral-950 hover:text-[#ebeae4] transition-all font-mono text-xs font-bold group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-950 group-hover:bg-neutral-100" />
                    <span>EMAIL PORT // trungdao131105@gmail.com</span>
                  </a>
                  <a
                    href="https://github.com/MilesDao"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 border border-neutral-900 px-4 py-3 bg-neutral-200/50 rounded hover:bg-neutral-950 hover:text-[#ebeae4] transition-all font-mono text-xs font-bold group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-950 group-hover:bg-neutral-100" />
                    <span>GITHUB PORT // @MilesDao</span>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/milesdao/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 border border-neutral-900 px-4 py-3 bg-neutral-200/50 rounded hover:bg-neutral-950 hover:text-[#ebeae4] transition-all font-mono text-xs font-bold group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-950 group-hover:bg-neutral-100" />
                    <span>LINKEDIN PORT // @milesdao</span>
                  </a>
                  {cvBlobUrl && (
                    <a
                      href={cvBlobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between border border-neutral-900 px-4 py-3 bg-neutral-200/50 rounded hover:bg-neutral-950 hover:text-[#ebeae4] transition-all font-mono text-xs font-bold group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-950 group-hover:bg-neutral-100 animate-pulse" />
                        <span>CV PORT // VIEW & DOWNLOAD</span>
                      </div>
                      <span className="text-[10px] uppercase font-black tracking-wider px-1.5 py-0.5 border border-neutral-900 group-hover:border-neutral-100 rounded">
                        OPEN
                      </span>
                    </a>
                  )}
                </div>
              </div>
            </div>

             {/* Right side: Education & Experience */}
             <div className="md:col-span-7 space-y-6 text-left">
               <h3 className="fade-text font-mono text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-300 pb-2 mb-4 opacity-0">
                 EDUCATION & EXPERIENCE
               </h3>
 
               <div className="space-y-4">
                 {educationList.map((entry, idx) => (
                   <div
                     key={entry.id || idx}
                     className="stagger-card border border-neutral-350 rounded overflow-hidden bg-neutral-200/20 hover:border-neutral-950 transition-colors duration-300 shadow-sm opacity-0"
                   >
                     <div className="bg-neutral-950 text-[#ebeae4] px-4 py-2.5 font-mono text-[10px] tracking-wider uppercase font-bold flex justify-between items-center">
                       <span>{entry.category}</span>
                       <span className="font-mono text-[9px] text-neutral-400 font-normal">{entry.period}</span>
                     </div>
                     <div className="bg-neutral-50/70 p-4 space-y-3">
                       <div className="text-[10px] font-mono text-neutral-500 font-bold uppercase tracking-wider">
                         LOCATION // {entry.location}
                       </div>
                       <ul className="space-y-1.5">
                         {entry.items.map((item, idy) => (
                           <li
                             key={idy}
                             className="flex items-start gap-2 font-mono text-xs text-neutral-700 leading-relaxed"
                           >
                             <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-1 flex-shrink-0" />
                             <span>{item}</span>
                           </li>
                         ))}
                       </ul>
                     </div>
                   </div>
                 ))}
               </div>
              </div>
           </div>
        </section>

        {/* ==================== PROJECTS SECTION ==================== */}
        <section
          id="projects-section"
          className="reveal-section w-full pt-20 pb-24 border-t border-transparent relative text-left"
        >
          {/* Expanding border line */}
          <div className="expand-line h-[2px] bg-neutral-950 mb-12 w-full origin-left scale-x-0" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
            <div>
              <p className="fade-text font-mono text-xs tracking-widest text-neutral-500 uppercase mb-2 opacity-0">
                BG—98 // SOME OF MY PROJECTS
              </p>
              <h2 className="fade-text font-display text-4xl font-black tracking-tight text-neutral-900 uppercase opacity-0">
                WORK
              </h2>
            </div>
            <p className="fade-text text-neutral-550 font-mono text-[9px] font-semibold tracking-wider opacity-0">
              SCROLL HORIZONTALLY TO EXPLORE PROJECTS
            </p>
          </div>

          {/* Horizontal projects scroller list */}
          <div className="mt-10 overflow-x-auto pb-6 scroll-smooth snap-x snap-mandatory flex gap-6 px-1">
            {projects.length === 0 ? (
              <p className="font-mono text-xs text-neutral-500 py-12 text-center w-full border border-dashed border-neutral-350 rounded bg-neutral-200/10">
                NO PROJECTS REGISTERED IN PERSISTENT VECTOR.
              </p>
            ) : (
              projects.map((proj) => (
                <div
                  key={proj.id}
                  className="stagger-card snap-start w-[290px] sm:w-[350px] flex-shrink-0 group border-2 border-neutral-900 rounded-lg bg-neutral-50 hover:bg-white hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-md opacity-0"
                >
                  <div>
                    {/* Project Image */}
                    <div className="h-44 w-full overflow-hidden border-b border-neutral-900 bg-neutral-200 relative">
                      {proj.image ? (
                        <img src={proj.image} alt={proj.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-mono text-neutral-400 text-[10px]">
                          [NO_VISUAL_STREAM]
                        </div>
                      )}
                      <span className="absolute top-3 left-3 font-mono text-[9px] text-[#ebeae4] bg-neutral-950 px-2 py-0.5 rounded font-bold">
                        {proj.year}
                      </span>
                    </div>

                    <div className="p-5 text-left">
                      <span className="font-mono text-[9px] tracking-wider uppercase text-neutral-400 font-bold block mb-1">
                        {proj.category}
                      </span>
                      <h3 className="font-display text-lg font-black tracking-tight text-neutral-950 line-clamp-1">
                        {proj.title}
                      </h3>
                      <p className="text-neutral-600 text-xs mt-2.5 leading-relaxed line-clamp-3">
                        {proj.description}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-2 flex flex-col gap-3">
                    <div className="flex flex-wrap gap-1">
                      {proj.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="font-mono text-[9px] text-neutral-500 border border-neutral-300 bg-neutral-100/50 rounded px-1.5 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                      {proj.tags.length > 3 && (
                        <span className="font-mono text-[9px] text-neutral-400 px-1 py-0.5">
                          +{proj.tags.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-end pt-2 border-t border-dashed border-neutral-300">
                      <a
                        href={proj.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[10px] font-black text-neutral-800 hover:text-neutral-950 hover:underline cursor-pointer"
                      >
                        LAUNCH DEPLOY <ArrowUpRight size={10} />
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ==================== BLOG SECTION ==================== */}
        <section
          id="blogs-section"
          className="reveal-section w-full pt-20 pb-24 border-t border-transparent relative text-left"
        >
          {/* Expanding border line */}
          <div className="expand-line h-[2px] bg-neutral-950 mb-12 w-full origin-left scale-x-0" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
            <div>
              <p className="fade-text font-mono text-xs tracking-widest text-neutral-500 uppercase mb-2 opacity-0">
                BG—98 // THESE BLOG POSTS ARE WHERE I CAN SHARE LESSONS LEARNED AND PERSONAL STORIES
              </p>
              <h2 className="fade-text font-display text-4xl font-black tracking-tight text-neutral-900 uppercase opacity-0">
                BLOG
              </h2>
            </div>
            <p className="fade-text text-neutral-550 font-mono text-[9px] font-semibold tracking-wider opacity-0">
              CLICK AN ENTRY TO READ THE FULL POST
            </p>
          </div>

          {/* Horizontal blogs scroller list */}
          <div className="mt-10 overflow-x-auto pb-6 scroll-smooth snap-x snap-mandatory flex gap-6 px-1">
            {blogs.length === 0 ? (
              <p className="font-mono text-xs text-neutral-500 py-12 text-center w-full border border-dashed border-neutral-350 rounded bg-neutral-200/10">
                NO JOURNAL REGISTERS IN MEMORY VECTOR.
              </p>
            ) : (
              blogs.map((blog) => (
                <div
                  key={blog.id}
                  onClick={() => {
                    window.history.pushState({ blogId: blog.id }, "", `?blog=${blog.id}`);
                    setSelectedBlog(blog);
                  }}
                  className="stagger-card snap-start w-[290px] sm:w-[350px] flex-shrink-0 group border-2 border-neutral-900 rounded-lg bg-neutral-50 hover:bg-white hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-md cursor-pointer text-left opacity-0"
                >
                  <div>
                    {/* Blog Image */}
                    <div className="h-44 w-full overflow-hidden border-b border-neutral-900 bg-neutral-200 relative">
                      {blog.image ? (
                        <img src={blog.image} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-mono text-neutral-400 text-[10px]">
                          [NO_VISUAL_STREAM]
                        </div>
                      )}
                      <span className="absolute top-3 left-3 font-mono text-[9px] text-[#ebeae4] bg-neutral-950 px-2 py-0.5 rounded font-bold">
                        {blog.date}
                      </span>
                    </div>

                    <div className="p-5">
                      <span className="font-mono text-[9px] tracking-wider uppercase text-neutral-400 font-bold block mb-1">
                        {blog.category}
                      </span>
                      <h3 className="font-display text-lg font-black tracking-tight text-neutral-950 line-clamp-1">
                        {blog.title}
                      </h3>
                      <p className="text-neutral-500 font-mono text-[10px] mt-2 font-semibold line-clamp-1 border-l-2 border-neutral-400 pl-2">
                        {blog.summary}
                      </p>
                      <p className="text-neutral-600 text-xs mt-3 leading-relaxed line-clamp-2">
                        {getBlogPreview(blog.content)}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-2 flex flex-col gap-3">
                    <div className="flex flex-wrap gap-1">
                      {blog.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="font-mono text-[9px] text-neutral-500 border border-neutral-300 bg-neutral-100/50 rounded px-1.5 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                      {blog.tags.length > 3 && (
                        <span className="font-mono text-[9px] text-neutral-400 px-1 py-0.5">
                          +{blog.tags.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-end pt-2 border-t border-dashed border-neutral-300">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-black text-neutral-800 group-hover:text-neutral-950 group-hover:underline">
                        READ ARTICLE <ArrowUpRight size={10} />
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>


        {/* ==================== FOOTER SECTION ==================== */}
        <footer
          id="main-app-footer"
          className="w-full flex justify-between items-end pt-8 pb-4 border-t border-neutral-300 z-40 select-none"
        >
          {/* Vertical barcode block on bottom left */}
          <div className="flex items-end gap-4">
            <div className="relative h-20 w-6 flex items-center justify-center overflow-hidden">
              <a href="https://www.facebook.com/milesdao13" target="_blank" rel="noopener noreferrer" title="Facebook Profile" className="hover:opacity-85 transition-opacity block w-[24px] h-[80px]">
                <Barcode id="footer-vertical-barcode" vertical width={80} height={24} />
              </a>
            </div>

            <div className="flex flex-col text-left">
              <span className="font-mono text-[9px] md:text-[10px] tracking-widest text-neutral-500 leading-tight">
                MILES DAO PORTFOLIO 26
              </span>
              <span className="font-mono text-[10px] md:text-xs text-neutral-900 font-medium mt-1">
                ©2026 MILES DAO ™
              </span>
              <div className="flex gap-3 mt-1.5 font-mono text-[9px] text-neutral-500 font-semibold tracking-wider">
                <a href="mailto:trungdao131105@gmail.com" className="hover:text-neutral-950 hover:underline">EMAIL</a>
                <span>/</span>
                <a href="https://github.com/MilesDao" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-950 hover:underline">GHUB</a>
                <span>/</span>
                <a href="https://www.linkedin.com/in/milesdao/" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-950 hover:underline">LNKD</a>
                {cvBlobUrl && (
                  <>
                    <span>/</span>
                    <a href={cvBlobUrl} target="_blank" rel="noopener noreferrer" className="hover:text-neutral-950 hover:underline">CV</a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bottom center System Ready status */}
          <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] tracking-widest text-[#111111] uppercase font-bold pr-16">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping inline-block" />
            <span>SYSTEM READY</span>
            <Asterisk size={10} className="text-neutral-400" />
          </div>

          {/* Quick interactive shortcut help */}
          <div className="font-mono text-[9px] text-neutral-400 text-right leading-relaxed hidden md:block">
            <p>PRESS <span className="text-neutral-900 font-bold bg-neutral-200 px-1 py-0.5 rounded">CMD + K</span> TO QUERY OPTIONS</p>
            <p>PRESS <span className="text-neutral-900 font-bold bg-neutral-200 px-1 py-0.5 rounded">TAB</span> TO READ BIO SPECS</p>
          </div>
        </footer>
      </motion.div>

      {/* ==================== DEDICATED BLOG READER OVERLAY ==================== */}
      <AnimatePresence>
        {selectedBlog && (
          <motion.div
            key="blog-reader-page"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed inset-0 z-50 bg-[#ebeae4] text-[#111111] overflow-y-auto p-6 md:p-16 flex flex-col justify-between select-text"
          >
            <div>
              {/* Back Button / Top Bar */}
              <header className="w-full flex justify-between items-center z-40 py-4 border-b border-neutral-900 mb-10">
                <div
                  onClick={handleBackToPortfolio}
                  className="flex flex-col font-display font-black leading-[0.8] text-sm md:text-base cursor-pointer tracking-tight hover:opacity-80 transition-opacity"
                >
                  <span>MILES</span>
                  <span>DAO</span>
                </div>
                <button
                  onClick={handleBackToPortfolio}
                  className="flex items-center gap-2 font-mono text-xs font-bold border border-neutral-900 px-4 py-2 bg-neutral-950 text-[#ebeae4] rounded hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  ← BACK TO PORTFOLIO
                </button>
              </header>

              {/* Main Content Layout */}
              {/* Main Content Layout */}
              <main className="w-full max-w-3xl mx-auto py-4 text-left">
                <h1 className="font-display text-xl md:text-2xl lg:text-3xl font-black tracking-tight text-neutral-950 uppercase leading-tight mb-6">
                  {selectedBlog.title}
                </h1>
                
                {/* Meta details row under Title */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-neutral-600 border-b border-neutral-300 pb-6 mb-8 select-none">
                  <p><span className="text-neutral-450 uppercase font-bold">DATE:</span> {selectedBlog.date}</p>
                  <span className="text-neutral-400 hidden sm:inline">/</span>
                  <p><span className="text-neutral-450 uppercase font-bold">INDEX:</span> B-DAO-{selectedBlog.id.slice(-6).toUpperCase()}</p>
                  <span className="text-neutral-400 hidden sm:inline">/</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedBlog.tags.map((tag) => (
                      <span key={tag} className="border border-neutral-350 bg-neutral-250/20 px-2 py-0.5 rounded text-[9px] uppercase font-bold text-neutral-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="font-mono text-sm md:text-base font-bold text-neutral-800 leading-relaxed border-l-4 border-neutral-950 pl-4 py-3 bg-neutral-200/40 pr-4 rounded-r mb-8">
                  {selectedBlog.summary}
                </p>

                <div className="text-neutral-800 text-base md:text-lg leading-relaxed space-y-4">
                  {(() => {
                    // Parse stored JSON blocks and render them
                    try {
                      const raw = selectedBlog.content;
                      if (!raw) return null;
                      let blocks: any[] = [];
                      if (raw.trim().startsWith("[")) {
                        blocks = JSON.parse(raw);
                      } else {
                        // Fallback: render as plain text for legacy content
                        return <p className="whitespace-pre-line text-base md:text-lg">{raw}</p>;
                      }
                      return blocks.map((block: any, i: number) => {
                        const key = block.id || `blk-${i}`;
                        switch (block.type) {
                          case "h1":
                            return <h2 key={key} className="font-display font-black text-2xl md:text-3xl text-neutral-950 uppercase tracking-tight mt-8 mb-3" dangerouslySetInnerHTML={{ __html: block.content }} />;
                          case "h2":
                            return <h3 key={key} className="font-mono font-bold text-lg md:text-xl text-neutral-900 uppercase mt-6 mb-2" dangerouslySetInnerHTML={{ __html: block.content }} />;
                          case "bullet":
                            return (
                              <div key={key} className="flex items-start gap-2.5 pl-2 text-base md:text-lg leading-relaxed">
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 mt-2.5 flex-shrink-0" />
                                <span dangerouslySetInnerHTML={{ __html: block.content }} />
                              </div>
                            );
                          case "todo":
                            return (
                              <div key={key} className="flex items-center gap-2.5 pl-2 font-mono text-sm">
                                <input type="checkbox" checked={!!block.properties?.checked} readOnly className="w-3.5 h-3.5 rounded pointer-events-none" />
                                <span className={block.properties?.checked ? "line-through text-neutral-400" : ""} dangerouslySetInnerHTML={{ __html: block.content }} />
                              </div>
                            );
                          case "quote":
                            return (
                              <blockquote key={key} className="border-l-4 border-neutral-950 pl-4 italic text-neutral-605 text-base md:text-lg my-4 bg-neutral-250/10 py-2.5 pr-4 rounded-r" dangerouslySetInnerHTML={{ __html: block.content }} />
                            );
                          case "code":
                            return (
                              <div key={key} className="bg-neutral-900 text-emerald-300 font-mono text-xs md:text-sm p-4 md:p-6 rounded my-4 overflow-x-auto">
                                {block.properties?.language && (
                                  <div className="text-neutral-500 text-[10px] uppercase font-bold mb-2 pb-2 border-b border-neutral-800">{block.properties.language}</div>
                                )}
                                <pre className="whitespace-pre-wrap">{block.content}</pre>
                              </div>
                            );
                          case "callout":
                            return (
                              <div key={key} className="bg-neutral-200/50 border border-neutral-300 rounded p-4 flex gap-3 my-4 text-base md:text-lg">
                                <span className="text-lg">{block.properties?.emoji || "💡"}</span>
                                <span dangerouslySetInnerHTML={{ __html: block.content }} />
                              </div>
                            );
                          case "toggle":
                            return (
                              <details key={key} className="pl-1.5 my-1.5 group">
                                <summary className="font-bold text-sm cursor-pointer list-none flex items-center gap-1.5">
                                  <span className="text-neutral-600 transition-transform group-open:rotate-90">▶</span>
                                  <span dangerouslySetInnerHTML={{ __html: block.content }} />
                                </summary>
                                {block.properties?.bgColor && (
                                  <div className="pl-8 border-l border-neutral-300 mt-2 py-1 text-sm text-neutral-500 whitespace-pre-line">{block.properties.bgColor}</div>
                                )}
                              </details>
                            );
                          case "math":
                            return (
                              <div key={key} className="bg-neutral-200/30 border border-neutral-300 rounded p-4 my-2 text-center font-serif italic text-xl font-bold tracking-wide text-neutral-900">
                                {block.content || "E = mc²"}
                              </div>
                            );
                          case "table":
                            if (block.properties?.tableData) {
                              return (
                                <div key={key} className="overflow-x-auto my-2">
                                  <table className="border-collapse w-full font-mono text-xs">
                                    <tbody>
                                      {block.properties.tableData.map((row: string[], rIdx: number) => (
                                        <tr key={rIdx} className={rIdx === 0 ? "bg-neutral-200/50 font-bold" : ""}>
                                          {row.map((cell: string, cIdx: number) => (
                                            <td key={cIdx} className="border border-neutral-400 p-2 min-w-[80px]">{cell}</td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            }
                            return null;
                          case "image":
                            return block.properties?.imageUrl ? (
                              <figure key={key} className="my-3" style={{ width: `${block.properties?.imageWidth ?? 100}%`, margin: "0 auto" }}>
                                <img src={block.properties.imageUrl} alt={block.content || "Image"} className="w-full rounded border border-neutral-300 shadow-sm" />
                                {block.content && (
                                  <figcaption className="text-center text-xs text-neutral-400 mt-2 italic">{block.content}</figcaption>
                                )}
                              </figure>
                            ) : null;
                          case "toc":
                            return null; // TOC is editor-only
                          case "synced":
                            return <div key={key} className="text-base md:text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: block.content }} />;
                          default:
                            // paragraph
                            if (!block.content) return <div key={key} className="h-4" />; // empty paragraph = spacer
                            return <p key={key} className="text-base md:text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: block.content }} />;
                        }
                      });
                    } catch {
                      // If parsing fails, render as plain text
                      return <p className="text-base md:text-lg whitespace-pre-line">{selectedBlog.content}</p>;
                    }
                  })()}
                </div>
              </main>
            </div>

            {/* Technical overlay footer */}
            <footer className="mt-16 pt-6 border-t border-dashed border-neutral-400 flex justify-between items-center text-xs font-mono text-neutral-500">
              <span>COMPILED JOURNAL SPECTRA // milesdao.com</span>
              <span>SYS_INVENTORY_EXEC</span>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== DIALOG SYSTEM REGISTRY ==================== */}
      <AnimatePresence mode="wait">
        {activeModal === "search" && (
          <CommandPalette
            id="search-palette-render"
            isOpen={true}
            onClose={() => setActiveModal(null)}
            onAction={handleAction}
          />
        )}

        {activeModal === "admin" && (
          <AdminModal
            id="admin-modal-render"
            isOpen={true}
            onClose={() => setActiveModal(null)}
            educationList={educationList}
            onRefreshData={async () => {
              try {
                const edu = await getEducationExperience();
                const sortedEdu = [...edu].sort((a, b) => a.sortOrder - b.sortOrder);
                setEducationList(sortedEdu);
              } catch (e) {
                console.error("Error refreshing education data:", e);
              }
            }}
            onEditBlog={(blog) => {
              setActiveModal(null);
              setEditingBlog(blog);
            }}
          />
        )}
      </AnimatePresence>

      {/* ==================== NOTION-STYLE BLOG EDITOR ==================== */}
      <AnimatePresence>
        {editingBlog && (
          <motion.div
            key="blog-editor-page"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed inset-0 z-[60] bg-[#ebeae4] text-[#111111] overflow-y-auto"
          >
            <BlogEditor
              blog={editingBlog}
              onClose={() => setEditingBlog(null)}
              onSave={async (updatedBlog) => {
                try {
                  await saveBlog(updatedBlog);
                  const blgs = await getBlogs();
                  const sortedBlogs = [...blgs].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
                  setBlogs(sortedBlogs);
                } catch (e) {
                  console.error("Error saving blog post:", e);
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
