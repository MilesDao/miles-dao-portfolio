import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ShieldAlert, Cpu, Terminal, ShieldCheck, Trash2, Plus, Upload, Check, GripVertical, Edit3 } from "lucide-react";
import { 
  isFallbackMode, 
  getProjects, saveProject, deleteProject, 
  getBlogs, saveBlog, deleteBlog,
  getCV, saveCV,
  getEducationExperience, saveEducationExperience, deleteEducationExperience
} from "../firebase";
import { Project, Blog, EducationExperience } from "../types";

interface ImageUploadAreaProps {
  imageValue: string;
  onImageChange: (base64: string) => void;
  label: string;
}

function ImageUploadArea({ imageValue, onImageChange, label }: ImageUploadAreaProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG, WEBP, etc.)");
      return;
    }
    if (file.size > 1024 * 1024) {
      alert("File size exceeds 1MB. Please upload a smaller image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onImageChange(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div 
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={`border border-dashed rounded p-4 flex flex-col items-center justify-center font-mono text-xs cursor-pointer transition-colors relative min-h-[110px] ${
        dragActive 
          ? "border-neutral-900 bg-neutral-200" 
          : imageValue 
            ? "border-emerald-500 bg-emerald-50/10" 
            : "border-neutral-300 hover:border-neutral-500 bg-white"
      }`}
    >
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
      />
      {imageValue ? (
        <div className="flex flex-col items-center gap-2 pointer-events-none">
          <img src={imageValue} alt="Preview" className="h-16 w-auto object-cover border border-neutral-400 rounded animate-fade-in" />
          <div className="flex items-center gap-1.5 text-emerald-700 text-[10px] font-bold uppercase">
            <Check size={12} /> IMAGE STAGED
          </div>
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onImageChange("");
            }}
            className="pointer-events-auto z-20 px-2 py-0.5 border border-red-300 rounded text-red-600 hover:bg-red-50 text-[9px] uppercase font-bold"
          >
            Clear Image
          </button>
        </div>
      ) : (
        <div className="text-center pointer-events-none text-neutral-500 flex flex-col items-center gap-1">
          <Upload size={18} className="text-neutral-400" />
          <p className="font-bold text-[10px] text-neutral-700">{label}</p>
          <p className="text-[9px] text-neutral-400">DRAG & DROP OR CLICK TO CHOOSE</p>
          <p className="text-[8px] text-neutral-400">MAX SIZE 1MB</p>
        </div>
      )}
    </div>
  );
}

interface AdminModalProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  educationList: EducationExperience[];
  onRefreshData: () => Promise<void>;
  onEditBlog: (blog: Blog) => void;
}

export default function AdminModal({ id, isOpen, onClose, educationList, onRefreshData, onEditBlog }: AdminModalProps) {
  const [accessKey, setAccessKey] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState(false);
  
  // Dashboard states
  const [activeTab, setActiveTab] = useState<"projects" | "blogs" | "cv" | "education">("projects");
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [blogsList, setBlogsList] = useState<Blog[]>([]);
  const [educationItems, setEducationItems] = useState<EducationExperience[]>([]);
  const [currentCV, setCurrentCV] = useState<{ name: string; fileData: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cvUploading, setCvUploading] = useState(false);
  
  // Drag and Drop reordering states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragActiveTab, setDragActiveTab] = useState<"projects" | "blogs" | "education" | null>(null);

  // Form states
  const [projectForm, setProjectForm] = useState({
    title: "",
    category: "",
    year: new Date().getFullYear().toString(),
    description: "",
    tags: "",
    link: "",
    image: ""
  });

  const [blogForm, setBlogForm] = useState({
    title: "",
    category: "",
    summary: "",
    content: "",
    tags: "",
    image: ""
  });

  const [educationForm, setEducationForm] = useState({
    category: "",
    location: "",
    period: "",
    itemsText: "",
    sortOrder: "1"
  });

  // Load lists upon successful authentication
  useEffect(() => {
    if (isAuthorized) {
      loadAllData();
    }
  }, [isAuthorized]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [projs, blgs, cv, edu] = await Promise.all([
        getProjects(),
        getBlogs(),
        getCV(),
        getEducationExperience()
      ]);
      setProjectsList(projs);
      setBlogsList(blgs);
      const sortedEdu = [...edu].sort((a, b) => a.sortOrder - b.sortOrder);
      setEducationItems(sortedEdu);
      if (cv) {
        setCurrentCV({ name: cv.name, fileData: cv.fileData });
      } else {
        setCurrentCV(null);
      }
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCVUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file only.");
      return;
    }
    if (file.size > 1024 * 1024) {
      alert("File size exceeds 1MB. Please compress your PDF.");
      return;
    }

    setCvUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        await saveCV({ name: file.name, fileData: base64 });
        setCurrentCV({ name: file.name, fileData: base64 });
        alert("CV updated successfully!");
      } catch (err: any) {
        console.error("Error saving CV:", err);
        const errMsg = err.message || "";
        if (errMsg.includes("timed out")) {
          alert("Failed to save CV: Connection timed out. Please check if your Firestore database has been created in the Firebase console.");
        } else if (err.code === "permission-denied" || errMsg.toLowerCase().includes("permission")) {
          alert("Failed to save CV: Permission Denied. Please check your Firestore Security Rules on the Firebase console. (Make sure write access is allowed)");
        } else if (errMsg.includes("exceeds") || errMsg.includes("too large") || base64.length > 1048576) {
          alert("Failed to save CV: File is too large for Firestore. Please compress your PDF below 500KB.");
        } else {
          alert(`Failed to save CV: ${errMsg || "Unknown database error"}`);
        }
      } finally {
        setCvUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Default secret access key is miles2026
    if (accessKey === "miles2026") {
      setIsAuthorized(true);
      setAuthError(false);
    } else {
      setAuthError(true);
      // reset error blinking after 2 seconds
      setTimeout(() => setAuthError(false), 2000);
    }
  };

  // --- DRAG AND DROP REORDER HANDLERS ---
  const handleDragStart = (tab: "projects" | "blogs" | "education", index: number) => {
    setDraggedIndex(index);
    setDragActiveTab(tab);
  };

  const handleDragOver = (e: React.DragEvent, tab: "projects" | "blogs" | "education", index: number) => {
    e.preventDefault();
    if (draggedIndex === null || dragActiveTab !== tab || draggedIndex === index) return;

    if (tab === "projects") {
      const list = [...projectsList];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setProjectsList(list);
    } else if (tab === "blogs") {
      const list = [...blogsList];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setBlogsList(list);
    } else if (tab === "education") {
      const list = [...educationItems];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setEducationItems(list);
    }
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null || dragActiveTab === null) return;
    const tab = dragActiveTab;
    setDraggedIndex(null);
    setDragActiveTab(null);

    setIsLoading(true);
    try {
      if (tab === "projects") {
        const updated = projectsList.map((item, idx) => ({ ...item, sortOrder: idx + 1 }));
        setProjectsList(updated);
        await Promise.all(updated.map(p => saveProject(p)));
      } else if (tab === "blogs") {
        const updated = blogsList.map((item, idx) => ({ ...item, sortOrder: idx + 1 }));
        setBlogsList(updated);
        await Promise.all(updated.map(b => saveBlog(b)));
      } else if (tab === "education") {
        const updated = educationItems.map((item, idx) => ({ ...item, sortOrder: idx + 1 }));
        setEducationItems(updated);
        await Promise.all(updated.map(e => saveEducationExperience(e)));
      }
      await onRefreshData();
    } catch (err) {
      console.error("Error persisting new order in database:", err);
      alert("Failed to save reordered list. Please check database permissions.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- PROJECT CRUD HANDLERS ---
  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.title || !projectForm.category || !projectForm.description) return;

    setIsLoading(true);
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      title: projectForm.title.toUpperCase(),
      category: projectForm.category,
      year: projectForm.year,
      description: projectForm.description,
      tags: projectForm.tags.split(",").map(t => t.trim()).filter(Boolean),
      link: projectForm.link || undefined,
      image: projectForm.image || "/assets/project_visual.png",
      sortOrder: projectsList.length + 1
    };

    try {
      await saveProject(newProj);
      setProjectForm({ title: "", category: "", year: new Date().getFullYear().toString(), description: "", tags: "", link: "", image: "" });
      await loadAllData();
      await onRefreshData();
      alert("Project saved successfully!");
    } catch (err: any) {
      console.error("Error saving project:", err);
      const errMsg = err.message || "";
      if (errMsg.includes("timed out")) {
        alert("Failed to save project: Connection timed out.");
      } else if (err.code === "permission-denied" || errMsg.toLowerCase().includes("permission")) {
        alert("Failed to save project: Permission Denied. Check your Firestore Security Rules.");
      } else {
        alert(`Failed to save project: ${errMsg || "Unknown database error"}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    setIsLoading(true);
    try {
      await deleteProject(id);
      await loadAllData();
      await onRefreshData();
    } catch (err) {
      alert("Error deleting project");
    } finally {
      setIsLoading(false);
    }
  };

  // --- BLOG CRUD HANDLERS ---
  const handleBlogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blogForm.title || !blogForm.category || !blogForm.content) return;

    setIsLoading(true);
    const newBlog: Blog = {
      id: `blog-${Date.now()}`,
      title: blogForm.title.toUpperCase(),
      category: blogForm.category,
      date: new Date().toISOString().split("T")[0],
      summary: blogForm.summary || blogForm.content.slice(0, 100) + "...",
      content: blogForm.content,
      tags: blogForm.tags.split(",").map(t => t.trim()).filter(Boolean),
      image: blogForm.image || "/assets/blog_visual.png",
      sortOrder: blogsList.length + 1
    };

    try {
      await saveBlog(newBlog);
      setBlogForm({ title: "", category: "", summary: "", content: "", tags: "", image: "" });
      await loadAllData();
      await onRefreshData();
      alert("Blog post published successfully!");
    } catch (err: any) {
      console.error("Error saving blog:", err);
      const errMsg = err.message || "";
      if (errMsg.includes("timed out")) {
        alert("Failed to publish blog: Connection timed out.");
      } else if (err.code === "permission-denied" || errMsg.toLowerCase().includes("permission")) {
        alert("Failed to publish blog: Permission Denied. Check your Firestore Security Rules.");
      } else {
        alert(`Failed to publish blog: ${errMsg || "Unknown database error"}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlogDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog post?")) return;
    setIsLoading(true);
    try {
      await deleteBlog(id);
      await loadAllData();
      await onRefreshData();
    } catch (err) {
      alert("Error deleting blog post");
    } finally {
      setIsLoading(false);
    }
  };

  // --- EDUCATION CRUD HANDLERS ---
  const handleEducationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!educationForm.category || !educationForm.location || !educationForm.period) return;

    setIsLoading(true);
    const newEdu: EducationExperience = {
      id: `edu-${Date.now()}`,
      category: educationForm.category.toUpperCase(),
      location: educationForm.location,
      period: educationForm.period,
      items: educationForm.itemsText.split("\n").map(item => item.trim()).filter(Boolean),
      sortOrder: educationItems.length + 1
    };

    try {
      await saveEducationExperience(newEdu);
      setEducationForm({ category: "", location: "", period: "", itemsText: "", sortOrder: "1" });
      await loadAllData();
      await onRefreshData();
      alert("Education & Experience entry saved successfully!");
    } catch (err: any) {
      console.error("Error saving education experience:", err);
      const errMsg = err.message || "";
      if (errMsg.includes("timed out")) {
        alert("Failed to save entry: Connection timed out.");
      } else if (err.code === "permission-denied" || errMsg.toLowerCase().includes("permission")) {
        alert("Failed to save entry: Permission Denied. Check your Firestore Security Rules.");
      } else {
        alert(`Failed to save entry: ${errMsg || "Unknown database error"}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEducationDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this education entry?")) return;
    setIsLoading(true);
    try {
      await deleteEducationExperience(id);
      await loadAllData();
      await onRefreshData();
    } catch (err) {
      alert("Error deleting education entry");
    } finally {
      setIsLoading(false);
    }
  };

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
        <div>
          {/* Header */}
          <div className="flex justify-between items-start border-b border-neutral-900 pb-6 mb-6">
            <div>
              <p className="font-mono text-xs tracking-widest text-neutral-500 uppercase mb-1">
                SECURE CONSOLE // MANAGEMENT
              </p>
              <h2 className="font-display text-3xl font-black tracking-tight text-neutral-900 flex items-center gap-2">
                <Terminal size={24} className="text-neutral-950" /> SYSTEM ADMIN
              </h2>
            </div>
            <button
              id="close-admin-btn"
              onClick={onClose}
              className="p-2 border border-neutral-900 rounded-full hover:bg-neutral-950 hover:text-[#ebeae4] transition-colors duration-200"
            >
              <X size={18} />
            </button>
          </div>

          {/* Secure access key check */}
          {!isAuthorized ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <motion.div
                animate={authError ? { x: [-10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
                className={`w-full max-w-sm border-2 p-6 rounded bg-neutral-50 ${
                  authError ? "border-red-600 bg-red-50 text-red-950" : "border-neutral-900"
                }`}
              >
                <div className="flex items-center gap-2 mb-4">
                  {authError ? <ShieldAlert size={20} className="text-red-600 animate-pulse" /> : <Cpu size={20} />}
                  <span className="font-mono text-xs font-black uppercase">
                    {authError ? "DECRYPTION SECURITY FAULT" : "SECURED SESSION ACCESS"}
                  </span>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block font-mono text-[9px] text-neutral-500 uppercase tracking-widest mb-1.5">
                      ENTER ENCRYPTION KEYWORD
                    </label>
                    <input
                      type="password"
                      placeholder="ACCESS KEY"
                      value={accessKey}
                      onChange={(e) => setAccessKey(e.target.value)}
                      className={`w-full bg-neutral-100 border border-neutral-900 rounded px-3 py-2.5 font-mono text-xs text-neutral-950 focus:outline-none placeholder-neutral-400 uppercase tracking-widest ${
                        authError ? "border-red-600 focus:border-red-600" : "focus:border-neutral-950"
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    className={`w-full py-3 border border-neutral-900 text-xs font-mono font-bold uppercase rounded transition-colors ${
                      authError 
                        ? "bg-red-600 text-white border-red-700" 
                        : "bg-neutral-950 text-[#ebeae4] hover:bg-neutral-800"
                    }`}
                  >
                    {authError ? "ACCESS DENIED" : "ESTABLISH CONSOLE PORT"}
                  </button>
                </form>
              </motion.div>
            </div>
          ) : (
            // AUTHENTICATED STATE
            <div className="space-y-6">
              {/* Dynamic Status readouts */}
              <div className={`p-3 rounded border font-mono text-[10px] flex items-center justify-between ${
                isFallbackMode 
                  ? "bg-amber-50 border-amber-300 text-amber-900" 
                  : "bg-emerald-50 border-emerald-300 text-emerald-900"
              }`}>
                <div className="flex items-center gap-2">
                  {isFallbackMode ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                  <span className="font-bold">
                    {isFallbackMode ? "SYS.STATUS: OFFLINE CACHE PORT" : "SYS.STATUS: CLOUD SYNCHRONIZED"}
                  </span>
                </div>
                <span>{isFallbackMode ? "[LOCALSTORAGE_BACKUP]" : "[FIRESTORE_ACTIVE]"}</span>
              </div>

              {/* Console Tabs */}
              <div className="flex border-b border-neutral-300 font-mono text-xs gap-1.5 pb-px">
                {(["projects", "blogs", "cv", "education"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 border border-b-0 border-neutral-900 rounded-t uppercase font-bold relative transition-colors ${
                      activeTab === tab 
                        ? "bg-neutral-950 text-[#ebeae4] translate-y-0.5" 
                        : "bg-neutral-200/50 hover:bg-neutral-200 text-neutral-700"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* TABS CONTAINER */}
              <div className="bg-neutral-50/50 p-4 border border-neutral-900 rounded min-h-[350px]">
                {isLoading && (
                  <div className="text-center py-12 font-mono text-xs text-neutral-500 animate-pulse">
                    EXECUTING DATABASE FETCH QUERY...
                  </div>
                )}

                {!isLoading && activeTab === "projects" && (
                  <div className="space-y-6">
                    {/* Add Project Form */}
                    <form onSubmit={handleProjectSubmit} className="space-y-3 bg-neutral-100 p-4 border border-neutral-300 rounded">
                      <h4 className="font-mono text-xs font-black uppercase text-neutral-800 pb-1 border-b border-neutral-300">
                        ADD PROJECT ENTRY
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Project Title"
                          value={projectForm.title}
                          onChange={(e) => setProjectForm({...projectForm, title: e.target.value})}
                          className="bg-white border border-neutral-400 rounded px-2.5 py-1.5 font-mono text-xs"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Category (e.g., Virtual Machine)"
                          value={projectForm.category}
                          onChange={(e) => setProjectForm({...projectForm, category: e.target.value})}
                          className="bg-white border border-neutral-400 rounded px-2.5 py-1.5 font-mono text-xs"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <input
                          type="text"
                          placeholder="Year"
                          value={projectForm.year}
                          onChange={(e) => setProjectForm({...projectForm, year: e.target.value})}
                          className="bg-white border border-neutral-400 rounded px-2.5 py-1.5 font-mono text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Tags (comma separated)"
                          value={projectForm.tags}
                          onChange={(e) => setProjectForm({...projectForm, tags: e.target.value})}
                          className="col-span-2 bg-white border border-neutral-400 rounded px-2.5 py-1.5 font-mono text-xs"
                        />
                      </div>
                      <textarea
                        placeholder="Description text snippet..."
                        value={projectForm.description}
                        onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                        className="w-full bg-white border border-neutral-400 rounded px-2.5 py-1.5 font-mono text-xs h-16 resize-none"
                        required
                      />
                      <div className="grid grid-cols-1 gap-3">
                        <input
                          type="text"
                          placeholder="Project Link URL (optional)"
                          value={projectForm.link}
                          onChange={(e) => setProjectForm({...projectForm, link: e.target.value})}
                          className="bg-white border border-neutral-400 rounded px-2.5 py-1.5 font-mono text-xs w-full"
                        />
                        <ImageUploadArea 
                          label="PROJECT COVER IMAGE"
                          imageValue={projectForm.image}
                          onImageChange={(base64) => setProjectForm({...projectForm, image: base64})}
                        />
                      </div>
                      <button type="submit" className="flex items-center gap-1.5 px-4 py-2 bg-neutral-950 text-[#ebeae4] rounded font-mono text-[10px] font-black uppercase tracking-wider hover:bg-neutral-800 transition-colors">
                        <Plus size={12} /> DEPLOY ARTIFACT
                      </button>
                    </form>

                    {/* Listing */}
                    <div className="space-y-2">
                      <h4 className="font-mono text-xs font-bold text-neutral-400 uppercase tracking-widest pb-1 border-b border-neutral-200">
                        ACTIVE ARTIFACT REGISTERS ({projectsList.length})
                      </h4>
                      <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                        {projectsList.map((proj, idx) => (
                          <div 
                            key={proj.id} 
                            draggable
                            onDragStart={() => handleDragStart("projects", idx)}
                            onDragOver={(e) => handleDragOver(e, "projects", idx)}
                            onDragEnd={handleDragEnd}
                            className={`flex justify-between items-center bg-white p-3 border border-neutral-300 rounded font-mono text-xs cursor-grab active:cursor-grabbing hover:border-neutral-400 transition-colors ${
                              dragActiveTab === "projects" && draggedIndex === idx ? "opacity-45 border-dashed border-neutral-950 bg-neutral-100" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-neutral-400 hover:text-neutral-600 flex-shrink-0">
                                <GripVertical size={14} />
                              </span>
                              <div className="text-left">
                                <p className="font-bold text-neutral-900">{proj.title}</p>
                                <p className="text-[10px] text-neutral-500">{proj.category} // {proj.year}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleProjectDelete(proj.id)}
                              className="p-1.5 border border-red-200 rounded hover:bg-red-50 text-red-600 transition-colors"
                              title="Delete project"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {!isLoading && activeTab === "blogs" && (
                  <div className="space-y-6">
                    {/* Add Blog Form */}
                    <form onSubmit={handleBlogSubmit} className="space-y-3 bg-neutral-100 p-4 border border-neutral-300 rounded">
                      <h4 className="font-mono text-xs font-black uppercase text-neutral-800 pb-1 border-b border-neutral-300">
                        PUBLISH JOURNAL ENTRY
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Article Title"
                          value={blogForm.title}
                          onChange={(e) => setBlogForm({...blogForm, title: e.target.value})}
                          className="bg-white border border-neutral-400 rounded px-2.5 py-1.5 font-mono text-xs"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Category (e.g., Machine Learning)"
                          value={blogForm.category}
                          onChange={(e) => setBlogForm({...blogForm, category: e.target.value})}
                          className="bg-white border border-neutral-400 rounded px-2.5 py-1.5 font-mono text-xs"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <input
                          type="text"
                          placeholder="Tags (comma separated)"
                          value={blogForm.tags}
                          onChange={(e) => setBlogForm({...blogForm, tags: e.target.value})}
                          className="col-span-3 bg-white border border-neutral-400 rounded px-2.5 py-1.5 font-mono text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <input
                          type="text"
                          placeholder="Short Summary / Excerpt"
                          value={blogForm.summary}
                          onChange={(e) => setBlogForm({...blogForm, summary: e.target.value})}
                          className="bg-white border border-neutral-400 rounded px-2.5 py-1.5 font-mono text-xs w-full"
                        />
                        <ImageUploadArea 
                          label="BLOG POST COVER IMAGE"
                          imageValue={blogForm.image}
                          onImageChange={(base64) => setBlogForm({...blogForm, image: base64})}
                        />
                      </div>
                      <textarea
                        placeholder="Write article markdown content..."
                        value={blogForm.content}
                        onChange={(e) => setBlogForm({...blogForm, content: e.target.value})}
                        className="w-full bg-white border border-neutral-400 rounded px-2.5 py-1.5 font-mono text-xs h-24 resize-none"
                        required
                      />
                      <button type="submit" className="flex items-center gap-1.5 px-4 py-2 bg-neutral-950 text-[#ebeae4] rounded font-mono text-[10px] font-black uppercase tracking-wider hover:bg-neutral-800 transition-colors">
                        <Plus size={12} /> PUBLISH ARTICLE
                      </button>
                    </form>

                    {/* Listing */}
                    <div className="space-y-2">
                      <h4 className="font-mono text-xs font-bold text-neutral-400 uppercase tracking-widest pb-1 border-b border-neutral-200">
                        JOURNAL ARTICLE REGISTERS ({blogsList.length})
                      </h4>
                      <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                        {blogsList.map((blog, idx) => (
                          <div 
                            key={blog.id} 
                            draggable
                            onDragStart={() => handleDragStart("blogs", idx)}
                            onDragOver={(e) => handleDragOver(e, "blogs", idx)}
                            onDragEnd={handleDragEnd}
                            className={`flex justify-between items-center bg-white p-3 border border-neutral-300 rounded font-mono text-xs cursor-grab active:cursor-grabbing hover:border-neutral-400 transition-colors ${
                              dragActiveTab === "blogs" && draggedIndex === idx ? "opacity-45 border-dashed border-neutral-950 bg-neutral-100" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-neutral-400 hover:text-neutral-600 flex-shrink-0">
                                <GripVertical size={14} />
                              </span>
                              <div className="text-left cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onEditBlog(blog)}>
                                <p className="font-bold text-neutral-900 hover:underline">{blog.title}</p>
                                <p className="text-[10px] text-neutral-500">{blog.category} // {blog.date}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onEditBlog(blog)}
                                className="p-1.5 border border-neutral-400 rounded hover:bg-neutral-950 hover:text-[#ebeae4] text-neutral-700 transition-colors"
                                title="Edit article in Notion workspace"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                onClick={() => handleBlogDelete(blog.id)}
                                className="p-1.5 border border-red-200 rounded hover:bg-red-50 text-red-600 transition-colors"
                                title="Delete article"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {!isLoading && activeTab === "cv" && (
                  <div className="space-y-6">
                    <div className="bg-neutral-100 p-4 border border-neutral-300 rounded space-y-4">
                      <h4 className="font-mono text-xs font-black uppercase text-neutral-800 pb-1 border-b border-neutral-300">
                        MANAGE CURRICULUM VITAE (CV)
                      </h4>
                      
                      {currentCV ? (
                        <div className="bg-white border border-neutral-300 rounded p-4 font-mono text-xs flex justify-between items-center">
                          <div className="text-left">
                            <p className="font-bold text-neutral-900">ACTIVE CV: {currentCV.name}</p>
                            <p className="text-[10px] text-neutral-500">Encoded & synchronised in database</p>
                          </div>
                          <a 
                            href={currentCV.fileData} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 border border-neutral-900 rounded hover:bg-neutral-950 hover:text-[#ebeae4] transition-colors uppercase font-bold text-[10px] select-none text-center"
                          >
                            Preview CV
                          </a>
                        </div>
                      ) : (
                        <div className="text-center p-6 border border-dashed border-amber-300 bg-amber-50/20 rounded font-mono text-xs text-amber-700">
                          ⚠️ NO CV UPLOADED YET. Fallback profile link will be inactive.
                        </div>
                      )}

                      {/* Drag & Drop PDF upload area */}
                      <div className="relative border-2 border-dashed border-neutral-300 rounded p-6 flex flex-col items-center justify-center font-mono text-xs hover:border-neutral-500 bg-white min-h-[140px] transition-colors">
                        <input 
                          type="file" 
                          accept="application/pdf"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleCVUpload(e.target.files[0]);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="text-center pointer-events-none text-neutral-500 flex flex-col items-center gap-2">
                          <Upload size={24} className="text-neutral-400 animate-pulse" />
                          <p className="font-bold text-[10px] text-neutral-700">UPLOAD NEW CV (PDF ONLY)</p>
                          <p className="text-[9px] text-neutral-400">DRAG & DROP OR CLICK TO BROWSE</p>
                          <p className="text-[8px] text-neutral-400">MAX SIZE: 1MB</p>
                        </div>
                      </div>
                      
                      {cvUploading && (
                        <div className="text-center text-xs font-mono text-neutral-500 animate-pulse">
                          ENCODING & DEPLOYING PDF ATOM...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!isLoading && activeTab === "education" && (
                  <div className="space-y-6">
                    {/* Add Education Form */}
                    <form onSubmit={handleEducationSubmit} className="space-y-3 bg-neutral-100 p-4 border border-neutral-300 rounded">
                      <h4 className="font-mono text-xs font-black uppercase text-neutral-800 pb-1 border-b border-neutral-300">
                        ADD EDUCATION & EXPERIENCE ENTRY
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Category / Institution / Role"
                          value={educationForm.category}
                          onChange={(e) => setEducationForm({...educationForm, category: e.target.value})}
                          className="bg-white border border-neutral-400 rounded px-2.5 py-1.5 font-mono text-xs"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Location (e.g., Ha Noi, Viet Nam)"
                          value={educationForm.location}
                          onChange={(e) => setEducationForm({...educationForm, location: e.target.value})}
                          className="bg-white border border-neutral-400 rounded px-2.5 py-1.5 font-mono text-xs"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1">
                        <input
                          type="text"
                          placeholder="Period (e.g., Sept 2023 – present)"
                          value={educationForm.period}
                          onChange={(e) => setEducationForm({...educationForm, period: e.target.value})}
                          className="bg-white border border-neutral-400 rounded px-2.5 py-1.5 font-mono text-xs w-full"
                          required
                        />
                      </div>
                      <textarea
                        placeholder="Bullet Points Achievements (one per line)&#10;e.g. GPA: 8.3/10&#10;USTH Merit Scholarship..."
                        value={educationForm.itemsText}
                        onChange={(e) => setEducationForm({...educationForm, itemsText: e.target.value})}
                        className="w-full bg-white border border-neutral-400 rounded px-2.5 py-1.5 font-mono text-xs h-24 resize-none"
                        required
                      />
                      <button type="submit" className="flex items-center gap-1.5 px-4 py-2 bg-neutral-950 text-[#ebeae4] rounded font-mono text-[10px] font-black uppercase tracking-wider hover:bg-neutral-800 transition-colors">
                        <Plus size={12} /> ADD ENTRY
                      </button>
                    </form>

                    {/* Listing */}
                    <div className="space-y-2">
                      <h4 className="font-mono text-xs font-bold text-neutral-400 uppercase tracking-widest pb-1 border-b border-neutral-200">
                        ACTIVE EXPERIENCE REGISTERS ({educationItems.length})
                      </h4>
                      <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                        {educationItems.map((edu, idx) => (
                          <div 
                            key={edu.id} 
                            draggable
                            onDragStart={() => handleDragStart("education", idx)}
                            onDragOver={(e) => handleDragOver(e, "education", idx)}
                            onDragEnd={handleDragEnd}
                            className={`flex justify-between items-start bg-white p-3 border border-neutral-300 rounded font-mono text-xs cursor-grab active:cursor-grabbing hover:border-neutral-400 transition-colors ${
                              dragActiveTab === "education" && draggedIndex === idx ? "opacity-45 border-dashed border-neutral-950 bg-neutral-100" : ""
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-neutral-400 hover:text-neutral-600 flex-shrink-0 mt-0.5">
                                <GripVertical size={14} />
                              </span>
                              <div className="text-left space-y-1">
                                <p className="font-bold text-neutral-900">{edu.category}</p>
                                <p className="text-[10px] text-neutral-500">{edu.location} // {edu.period}</p>
                                <ul className="list-disc pl-4 text-[10px] text-neutral-600 space-y-0.5">
                                  {edu.items.map((it, idy) => (
                                    <li key={idy}>{it}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            <button
                              onClick={() => handleEducationDelete(edu.id)}
                              className="p-1.5 border border-red-200 rounded hover:bg-red-50 text-red-600 transition-colors flex-shrink-0 ml-4"
                              title="Delete entry"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}


              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-dashed border-neutral-400 flex justify-between items-center text-xs font-mono text-neutral-500">
          <span>CONSOLE SERVICE PANEL v26</span>
          <span>MILES_DAO@SECURE_NET</span>
        </div>
      </motion.div>
    </div>
  );
}
