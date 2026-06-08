import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import { Project, Blog, MediaItem, EducationExperience } from "./types";

// Dynamic configuration loading
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if credentials exist. If not, operating in local-fallback mode
export const isFallbackMode = !firebaseConfig.apiKey || !firebaseConfig.projectId;

let db: any = null;
let auth: any = null;

if (!isFallbackMode) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    console.error("Firebase initialization failed, falling back to local cache:", error);
  }
}

export async function signInAdmin(): Promise<void> {
  if (isFallbackMode || !auth) return;
  try {
    await signInAnonymously(auth);
  } catch (error) {
    console.error("Admin authentication failed:", error);
    throw error;
  }
}

// ==========================================
// SEED DEFAULT DATA
// ==========================================
const DEFAULT_PROJECTS: Project[] = [
  {
    id: "proj-01",
    title: "COGNITION // APPARATUS",
    category: "Neural Synthesizer",
    year: "2025",
    description: "A real-time high-density acoustic synthesizer translating brainwave telemetry mapping into spatial environments.",
    tags: ["TypeScript", "WebAudio API", "Fast Fourier", "Canvas3D"],
    link: "https://github.com/milesdao/cognition",
    image: "/assets/project_visual.png",
    sortOrder: 1
  },
  {
    id: "proj-02",
    title: "ORBITAL_ZERO // METRIQ",
    category: "Satellite Telemetry",
    year: "2025",
    description: "High-performance vector visualizer processing live satellite trajectories with an interactive Kepler orbit model.",
    tags: ["React 19", "WebGL", "Trigonometry", "Tailwind CSS"],
    link: "https://orbital.milesdao.com",
    image: "/assets/project_visual.png",
    sortOrder: 2
  },
  {
    id: "proj-03",
    title: "CHRONOS // CONSENSUS",
    category: "Cryptographic state",
    year: "2024",
    description: "Bespoke browser-native cryptographic simulation demonstrating state replication and anti-tamper distributed ledgers.",
    tags: ["Rust", "WASM", "WebRTC", "Reactive Engine"],
    link: "https://chronos.ledger.net",
    image: "/assets/project_visual.png",
    sortOrder: 3
  },
  {
    id: "proj-04",
    title: "NEX_SPARK // CORE-VM",
    category: "Virtual Machine",
    year: "2026",
    description: "A sandbox environment parsing bespoke assembly code in a highly visual step-by-step register tape pipeline.",
    tags: ["AST Parser", "Lexer", "React Hooks", "Framer Motion"],
    link: "https://spark.milesdao.com",
    image: "/assets/project_visual.png",
    sortOrder: 4
  }
];

const DEFAULT_BLOGS: Blog[] = [
  {
    id: "blog-01",
    title: "DATA_MAPPING // NEURAL_NETWORKS",
    category: "Machine Learning",
    date: "2026-05-12",
    summary: "A detailed analysis of high-density weights mapping in deep feedforward architectures.",
    content: "Deep feedforward networks map high-dimensional representation fields onto logical categories. In this post, we explore how weight telemetry is tracked, optimized, and serialized into visual register matrices in browser engines using WebGL and Canvas.",
    tags: ["Neural Networks", "Telemetry", "WGL", "Data Science"],
    image: "/assets/blog_visual.png",
    sortOrder: 1
  },
  {
    id: "blog-02",
    title: "BRUTALIST_UI // DESIGN_PHILOSOPHY",
    category: "User Interfaces",
    date: "2026-06-02",
    summary: "Why modern layout architectures are ditching smooth gradients for high-contrast border grid alignments.",
    content: "Brutalist web interfaces utilize raw layouts, thick borders, monospace typography, and coordinate readouts. By eliminating styling bulk, these systems increase cognitive efficiency and load speeds, providing users with premium, distinct micro-systems.",
    tags: ["UI/UX", "Brutalist CSS", "Minimalism", "Typography"],
    image: "/assets/blog_visual.png",
    sortOrder: 2
  }
];

const DEFAULT_MEDIA: MediaItem[] = [
  {
    id: "med-01",
    filename: "portrait.png",
    url: "/assets/portrait.png",
    size: "1.91 MB",
    type: "image/png",
    uploadedAt: "2026-06-08"
  },
  {
    id: "med-02",
    filename: "text_texture.png",
    url: "/assets/text_texture.png",
    size: "420 KB",
    type: "image/png",
    uploadedAt: "2026-06-08"
  }
];

// ==========================================
// DATABASE UTILITIES (FIRESTORE / LOCAL STORAGE)
// ==========================================

// Promise timeout wrapper to prevent Firestore connection hangs
const withTimeout = <T>(promise: Promise<T>, ms: number = 2000): Promise<T> => {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Firestore operation timed out"));
    }, ms);
  });
  return Promise.race([
    promise.then((val) => {
      clearTimeout(timeoutId);
      return val;
    }),
    timeoutPromise,
  ]);
};

// Helper to initialize local storage default seeds
const getLocalData = <T>(key: string, defaults: T[]): T[] => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(data);
};

const saveLocalData = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- PROJECTS CRUD ---
export async function getProjects(): Promise<Project[]> {
  if (isFallbackMode) {
    const local = getLocalData("portfolio_projects", DEFAULT_PROJECTS);
    return local.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
  try {
    const querySnapshot = await withTimeout(getDocs(collection(db, "projects")), 2000);
    const projects: Project[] = [];
    querySnapshot.forEach((doc) => {
      projects.push({ ...doc.data() } as Project);
    });
    if (projects.length === 0) {
      // Seed firestore if empty
      for (const proj of DEFAULT_PROJECTS) {
        await saveProject(proj);
      }
      return [...DEFAULT_PROJECTS].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
    return projects.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  } catch (err) {
    console.error("Firestore read error, falling back to LocalStorage:", err);
    const local = getLocalData("portfolio_projects", DEFAULT_PROJECTS);
    return local.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
}

export async function saveProject(project: Project): Promise<void> {
  if (isFallbackMode) {
    const list = getLocalData("portfolio_projects", DEFAULT_PROJECTS);
    const index = list.findIndex(p => p.id === project.id);
    if (index > -1) list[index] = project;
    else list.push(project);
    saveLocalData("portfolio_projects", list);
    return;
  }
  try {
    await withTimeout(setDoc(doc(db, "projects", project.id), project), 2000);
  } catch (err) {
    console.error("Firestore write error:", err);
    throw err;
  }
}

export async function deleteProject(id: string): Promise<void> {
  if (isFallbackMode) {
    const list = getLocalData("portfolio_projects", DEFAULT_PROJECTS);
    const filtered = list.filter(p => p.id !== id);
    saveLocalData("portfolio_projects", filtered);
    return;
  }
  try {
    await deleteDoc(doc(db, "projects", id));
  } catch (err) {
    console.error("Firestore delete error:", err);
    throw err;
  }
}

// --- BLOGS CRUD ---
export async function getBlogs(): Promise<Blog[]> {
  if (isFallbackMode) {
    const local = getLocalData("portfolio_blogs", DEFAULT_BLOGS);
    return local.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
  try {
    const querySnapshot = await withTimeout(getDocs(collection(db, "blogs")), 2000);
    const blogs: Blog[] = [];
    querySnapshot.forEach((doc) => {
      blogs.push({ ...doc.data() } as Blog);
    });
    if (blogs.length === 0) {
      for (const blog of DEFAULT_BLOGS) {
        await saveBlog(blog);
      }
      return [...DEFAULT_BLOGS].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
    return blogs.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  } catch (err) {
    console.error("Firestore blogs read error:", err);
    const local = getLocalData("portfolio_blogs", DEFAULT_BLOGS);
    return local.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
}

export async function saveBlog(blog: Blog): Promise<void> {
  if (isFallbackMode) {
    const list = getLocalData("portfolio_blogs", DEFAULT_BLOGS);
    const index = list.findIndex(b => b.id === blog.id);
    if (index > -1) list[index] = blog;
    else list.push(blog);
    saveLocalData("portfolio_blogs", list);
    return;
  }
  try {
    await withTimeout(setDoc(doc(db, "blogs", blog.id), blog), 2000);
  } catch (err) {
    console.error("Firestore blog write error:", err);
    throw err;
  }
}

export async function deleteBlog(id: string): Promise<void> {
  if (isFallbackMode) {
    const list = getLocalData("portfolio_blogs", DEFAULT_BLOGS);
    const filtered = list.filter(b => b.id !== id);
    saveLocalData("portfolio_blogs", filtered);
    return;
  }
  try {
    await deleteDoc(doc(db, "blogs", id));
  } catch (err) {
    console.error("Firestore blog delete error:", err);
    throw err;
  }
}

// --- MEDIA CRUD ---
export async function getMedia(): Promise<MediaItem[]> {
  if (isFallbackMode) {
    return getLocalData("portfolio_media", DEFAULT_MEDIA);
  }
  try {
    const querySnapshot = await getDocs(collection(db, "media"));
    const media: MediaItem[] = [];
    querySnapshot.forEach((doc) => {
      media.push({ ...doc.data() } as MediaItem);
    });
    if (media.length === 0) {
      for (const med of DEFAULT_MEDIA) {
        await saveMediaItem(med);
      }
      return DEFAULT_MEDIA;
    }
    return media;
  } catch (err) {
    console.error("Firestore media read error:", err);
    return getLocalData("portfolio_media", DEFAULT_MEDIA);
  }
}

export async function saveMediaItem(item: MediaItem): Promise<void> {
  if (isFallbackMode) {
    const list = getLocalData("portfolio_media", DEFAULT_MEDIA);
    const index = list.findIndex(m => m.id === item.id);
    if (index > -1) list[index] = item;
    else list.push(item);
    saveLocalData("portfolio_media", list);
    return;
  }
  try {
    await setDoc(doc(db, "media", item.id), item);
  } catch (err) {
    console.error("Firestore media write error:", err);
    throw err;
  }
}

export async function deleteMediaItem(id: string): Promise<void> {
  if (isFallbackMode) {
    const list = getLocalData("portfolio_media", DEFAULT_MEDIA);
    const filtered = list.filter(m => m.id !== id);
    saveLocalData("portfolio_media", filtered);
    return;
  }
  try {
    await deleteDoc(doc(db, "media", id));
  } catch (err) {
    console.error("Firestore media delete error:", err);
    throw err;
  }
}

// --- CV CRUD ---
export interface CVData {
  id: string;
  name: string;
  fileData: string; // Base64 data URL
  uploadedAt: string;
}

export async function getCV(): Promise<CVData | null> {
  if (isFallbackMode) {
    const data = localStorage.getItem("portfolio_cv");
    return data ? JSON.parse(data) : null;
  }
  try {
    const querySnapshot = await withTimeout(getDocs(collection(db, "config")), 2000);
    let cv: CVData | null = null;
    querySnapshot.forEach((doc) => {
      if (doc.id === "cv") {
        cv = { ...doc.data() } as CVData;
      }
    });
    return cv;
  } catch (err) {
    console.error("Firestore CV read error, falling back to LocalStorage:", err);
    const data = localStorage.getItem("portfolio_cv");
    return data ? JSON.parse(data) : null;
  }
}

export async function saveCV(cv: { name: string, fileData: string }): Promise<void> {
  const cvDoc: CVData = {
    id: "cv",
    name: cv.name,
    fileData: cv.fileData,
    uploadedAt: new Date().toISOString()
  };
  if (isFallbackMode) {
    localStorage.setItem("portfolio_cv", JSON.stringify(cvDoc));
    return;
  }
  try {
    await withTimeout(setDoc(doc(db, "config", "cv"), cvDoc), 2000);
  } catch (err) {
    console.error("Firestore CV write error:", err);
    throw err;
  }
}

// ==========================================
// EDUCATION & EXPERIENCE CRUD
// ==========================================
const DEFAULT_EDUCATION: EducationExperience[] = [
  {
    id: "edu-01",
    category: "DAI MO HIGH SCHOOL // GRADUATE",
    location: "Ha Noi, Viet Nam",
    period: "2020 – 2023",
    items: [
      "GPA: 8.3/10"
    ],
    sortOrder: 1
  },
  {
    id: "edu-02",
    category: "BSC UNIVERSITY OF SCIENCE AND TECHNOLOGY OF HA NOI // DATA SCIENCE",
    location: "Ha Noi, Viet Nam",
    period: "Sept 2023 – present",
    items: [
      "GPA: 16.76/20 in 1st year | 18.03/20 in 1st semester − 2nd year",
      "USTH Merit Scholarship 2023 – 2024: A4 (40% of Tuition Fees)",
      "USTH Merit Scholarship 2024 – 2025: A2 (80% of Tuition Fees)"
    ],
    sortOrder: 2
  },
  {
    id: "edu-03",
    category: "CMC CORPORATION // AI RESEARCHER",
    location: "Ha Noi, Viet Nam",
    period: "Mar 2026 – present",
    items: [
      "Develop and optimize computer vision models for real-world applications.",
      "Work on pose estimation tasks."
    ],
    sortOrder: 3
  }
];

export async function getEducationExperience(): Promise<EducationExperience[]> {
  if (isFallbackMode) {
    const local = getLocalData("portfolio_education", DEFAULT_EDUCATION);
    return local.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  try {
    const querySnapshot = await withTimeout(getDocs(collection(db, "education")), 2000);
    const education: EducationExperience[] = [];
    querySnapshot.forEach((doc) => {
      education.push({ ...doc.data() } as EducationExperience);
    });
    if (education.length === 0) {
      for (const edu of DEFAULT_EDUCATION) {
        await saveEducationExperience(edu);
      }
      return [...DEFAULT_EDUCATION].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return education.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (err) {
    console.error("Firestore education read error, falling back to LocalStorage:", err);
    const local = getLocalData("portfolio_education", DEFAULT_EDUCATION);
    return local.sort((a, b) => a.sortOrder - b.sortOrder);
  }
}

export async function saveEducationExperience(entry: EducationExperience): Promise<void> {
  if (isFallbackMode) {
    const list = getLocalData("portfolio_education", DEFAULT_EDUCATION);
    const index = list.findIndex(e => e.id === entry.id);
    if (index > -1) list[index] = entry;
    else list.push(entry);
    saveLocalData("portfolio_education", list);
    return;
  }
  try {
    await withTimeout(setDoc(doc(db, "education", entry.id), entry), 2000);
  } catch (err) {
    console.error("Firestore education write error:", err);
    throw err;
  }
}

export async function deleteEducationExperience(id: string): Promise<void> {
  if (isFallbackMode) {
    const list = getLocalData("portfolio_education", DEFAULT_EDUCATION);
    const filtered = list.filter(e => e.id !== id);
    saveLocalData("portfolio_education", filtered);
    return;
  }
  try {
    await deleteDoc(doc(db, "education", id));
  } catch (err) {
    console.error("Firestore education delete error:", err);
    throw err;
  }
}


