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
const DEFAULT_PROJECTS: Project[] = [];

const DEFAULT_BLOGS: Blog[] = [
  {
    id: "blog-03",
    title: "THREE YEARS AT USTH: NOT QUITE THE STORY I EXPECTED",
    category: "Personal Journey",
    date: "2026-06-10",
    summary: "A personal reflection on three years at the University of Science and Technology of Hanoi — the dreams I carried in, the lessons I carried out, and the quiet strength I found along the way.",
    content: JSON.stringify([
      {
        id: "b-0", type: "paragraph", content: "When I received my admission letter to USTH three years ago, I imagined that university life would be one of the most exciting chapters of my life. I pictured myself meeting new people, learning fascinating subjects, joining interesting activities, and gradually building the future I dreamed of. In my mind, everything seemed bright and full of opportunities. Of course, I knew there would be challenges, but I believed <strong>passion and determination would be enough</strong> to overcome them."
      },
      {
        id: "b-1", type: "paragraph", content: "Looking back now, after three years at USTH, I can confidently say that university has been one of the most rewarding experiences of my life — but <strong>not for the reasons I originally expected</strong>."
      },
      {
        id: "b-2", type: "quote", content: "\"It is not the destination that shapes you, but the road you never planned to take.\""
      },
      {
        id: "b-4", type: "h2", content: "YEAR 1 — THE WEIGHT OF EXPECTATION"
      },
      {
        id: "b-5", type: "paragraph", content: "The first year hit me harder than I ever anticipated. I walked into lecture halls with the same confidence I had carried through high school, only to realize that confidence meant nothing here. The professors moved fast. The material was dense. And for the first time in my life, <strong>I felt truly lost</strong>."
      },
      {
        id: "b-6", type: "paragraph", content: "I remember sitting in a Calculus lecture during my second semester, watching the professor fill the blackboard with symbols that might as well have been ancient Greek. The students around me nodded along, scribbling notes, while I sat frozen — my pen hovering over an empty page, my mind completely blank. I had never felt so stupid in my entire life."
      },
      {
        id: "b-7", type: "paragraph", content: "That night, I deleted the ambitious goal chart I had pinned above my desk. I lay in bed staring at the ceiling, wondering if I had made a mistake."
      },
      {
        id: "b-8", type: "quote", content: "\"Sometimes the first step forward is admitting that you have no idea where you are going.\""
      },
      {
        id: "b-9", type: "paragraph", content: "What followed was a long, quiet battle with myself. I stopped telling people I was fine. I started waking up at 5 AM to study before class. I solved problem after problem, failed again and again, and slowly — <strong>painfully slowly</strong> — I began to understand. Not because I was gifted, but because <strong>I refused to give up</strong>."
      },
      {
        id: "b-10", type: "paragraph", content: "By the end of Year 1, my grades were nothing special. But I had learned something more important than any exam could teach me: <strong>resilience is not born from success. It is forged in the moments when quitting would be easier.</strong>"
      },
      {
        id: "b-11", type: "quote", content: "\"Fall seven times, stand up eight.\" — Japanese Proverb"
      },
      {
        id: "b-13", type: "h2", content: "YEAR 2 — THE FIRE OF GROWTH"
      },
      {
        id: "b-14", type: "paragraph", content: "Year 2 was when I stopped surviving and started building. I had learned enough to be dangerous, and I threw myself into everything — hackathons, side projects, open source contributions, club activities. I stayed up for 48 hours straight during one project sprint, running on instant noodles and the desperate need to prove that I belonged."
      },
      {
        id: "b-15", type: "paragraph", content: "But <strong>the code was the easy part. The hard part was people.</strong>"
      },
      {
        id: "b-16", type: "paragraph", content: "I clashed with teammates. I took feedback as personal attack. I tried to do everything myself because I didn't trust anyone else to do it right. I remember one group project where I completely took over, refusing to delegate, convinced that my way was the only way. The project worked, but my teammates stopped talking to me."
      },
      {
        id: "b-17", type: "paragraph", content: "A professor pulled me aside after that class and said something I will never forget: <strong>\"Being the smartest person in the room is not the same as being the best teammate.\"</strong>"
      },
      {
        id: "b-18", type: "paragraph", content: "That sentence hit harder than any failed exam ever could."
      },
      {
        id: "b-19", type: "quote", content: "\"If you want to go fast, go alone. If you want to go far, go together.\" — African Proverb"
      },
      {
        id: "b-20", type: "paragraph", content: "I started learning to listen. To trust. To let go of control. It was uncomfortable, humbling, and ultimately <strong>the most important growth of my entire university journey</strong>. By the end of Year 2, I had not just built projects — I had built relationships. And those relationships carried me through moments no amount of technical skill could fix."
      },
      {
        id: "b-22", type: "h2", content: "YEAR 3 — THE WEIGHT OF PERSPECTIVE"
      },
      {
        id: "b-23", type: "paragraph", content: "Year 3 arrived faster than I expected. Suddenly I was the senior — the one that freshmen looked to for advice. I felt like a fraud. I still felt like I was one bad grade away from being exposed as someone who didn't belong."
      },
      {
        id: "b-24", type: "paragraph", content: "But when I looked at those freshmen, <strong>I saw myself</strong>. The same nervous energy. The same desperate need to prove something. And I realized that the difference between us wasn't talent or intelligence — it was simply <strong>having been through the fire and survived</strong>."
      },
      {
        id: "b-25", type: "paragraph", content: "I started mentoring. I helped a freshman who was struggling with the same Data Structures class that had almost broken me. I watched his face as he finally understood recursion — that moment of relief, of joy, of quiet pride. I recognized that feeling. <strong>I had earned it too.</strong>"
      },
      {
        id: "b-26", type: "quote", content: "\"We rise by lifting others.\" — Robert Ingersoll"
      },
      {
        id: "b-27", type: "paragraph", content: "But Year 3 also brought loss. A close friend of mine — one of the brightest people I have ever known — dropped out. The pressure had become too much. We sat together in a small cafe near campus, and he told me he was leaving. I saw in his eyes the same loneliness I had felt in that lecture hall two years ago. I didn't try to convince him to stay. I just sat with him, and we talked about everything except school."
      },
      {
        id: "b-28", type: "paragraph", content: "After he left, I understood something that no textbook could ever teach me: <strong>the people who make it through are not the strongest or the smartest. They are the ones who had support. The ones who found their people. The ones who learned to ask for help.</strong>"
      },
      {
        id: "b-29", type: "paragraph", content: "I had been lucky. I had found a small group of friends who carried me through my worst days. And I learned that the greatest strength is not standing alone — it is knowing when to lean on someone."
      },
      {
        id: "b-30", type: "quote", content: "\"A smooth sea never made a skilled sailor.\" — Franklin D. Roosevelt"
      },
      {
        id: "b-32", type: "h1", content: "REFLECTIONS — THE UNEXPECTED DESTINATION"
      },
      {
        id: "b-33", type: "paragraph", content: "Three years ago, I thought I knew exactly what success looked like. A high GPA. A dream internship. A startup launched before graduation. These were the milestones I had mapped out, the metrics I believed would define my worth."
      },
      {
        id: "b-34", type: "paragraph", content: "I was wrong."
      },
      {
        id: "b-35", type: "paragraph", content: "Success, I have learned, is none of those things. <strong>Success is the ability to look at yourself in the mirror after a year of failure and decide to keep going.</strong> It is the late-night conversations with friends who become family. It is the quiet satisfaction of solving a problem that once seemed impossible. It is the humility to admit you don't have all the answers — and the courage to keep searching anyway."
      },
      {
        id: "b-36", type: "quote", content: "\"Education is not the filling of a pail, but the lighting of a fire.\" — W.B. Yeats"
      },
      {
        id: "b-37", type: "paragraph", content: "If you are reading this at the beginning of your own journey — whether at USTH or anywhere else — let me tell you what I wish someone had told me:"
      },
      {
        id: "b-38", type: "paragraph", content: "<strong>It is okay to struggle. It is okay to change your mind. It is okay to not know who you are yet.</strong> The person you will become will not be the person you planned to be — and that is not a failure. <strong>That is the whole point.</strong>"
      },
      {
        id: "b-39", type: "paragraph", content: "The idealism I arrived with was not wrong. It was simply incomplete. I had imagined success as a straight line — a smooth ascent to a predetermined peak. I did not know that the path would loop back on itself, that I would lose my way and find it again, that the <strong>detours would teach me more than the straightaways ever could</strong>."
      },
      {
        id: "b-40", type: "paragraph", content: "Resilience is not about never falling. It is about learning how to fall — and how to get back up — with grace, with humor, with the help of the people who love you."
      },
      {
        id: "b-41", type: "paragraph", content: "Three years at USTH did not make me the person I planned to be. They made me <strong>someone better</strong>: someone who knows that the plan was never the point."
      },
      {
        id: "b-42", type: "paragraph", content: "The journey was the point. And I am still walking."
      },
      {
        id: "b-43", type: "quote", content: "\"The only impossible journey is the one you never begin.\" — Tony Robbins"
      }
    ]),
    tags: ["Personal Journey", "USTH", "Resilience", "Mental Health", "Growth", "Student Life"],
    image: "/assets/blog_visual.png",
    sortOrder: 3
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

// Version key to force cache refresh when defaults change
const DATA_VERSION = "5";

// Helper to initialize local storage default seeds
const getLocalData = <T>(key: string, defaults: T[]): T[] => {
  const versionKey = `${key}_version`;
  const savedVersion = localStorage.getItem(versionKey);
  if (savedVersion !== DATA_VERSION) {
    localStorage.setItem(key, JSON.stringify(defaults));
    localStorage.setItem(versionKey, DATA_VERSION);
    return defaults;
  }
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaults));
    localStorage.setItem(versionKey, DATA_VERSION);
    return defaults;
  }
  return JSON.parse(data);
};

const saveLocalData = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
  localStorage.setItem(`${key}_version`, DATA_VERSION);
};

// --- PROJECTS CRUD ---
export async function getProjects(): Promise<Project[]> {
  if (isFallbackMode) {
    const local = getLocalData("portfolio_projects", DEFAULT_PROJECTS);
    return local.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
  try {
    const querySnapshot = await withTimeout(getDocs(collection(db, "projects")), 8000);
    const projects: Project[] = [];
    querySnapshot.forEach((doc) => {
      projects.push({ ...doc.data() } as Project);
    });
    if (projects.length === 0) {
      // Seed firestore if empty
      for (const proj of DEFAULT_PROJECTS) {
        await saveProject(proj);
      }
      saveLocalData("portfolio_projects", DEFAULT_PROJECTS);
      return [...DEFAULT_PROJECTS].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
    const sortedProjects = projects.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    saveLocalData("portfolio_projects", sortedProjects); // Sync to local storage
    return sortedProjects;
  } catch (err) {
    console.error("Firestore read error, falling back to LocalStorage:", err);
    const local = getLocalData("portfolio_projects", DEFAULT_PROJECTS);
    return local.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
}

export async function saveProject(project: Project): Promise<void> {
  // Always update LocalStorage cache first so fallback has the latest data
  const list = getLocalData("portfolio_projects", DEFAULT_PROJECTS);
  const index = list.findIndex(p => p.id === project.id);
  if (index > -1) list[index] = project;
  else list.push(project);
  saveLocalData("portfolio_projects", list);

  if (isFallbackMode) return;

  try {
    await withTimeout(setDoc(doc(db, "projects", project.id), project), 15000);
  } catch (err) {
    console.error("Firestore write error:", err);
    throw err;
  }
}

export async function deleteProject(id: string): Promise<void> {
  // Always update LocalStorage cache first
  const list = getLocalData("portfolio_projects", DEFAULT_PROJECTS);
  const filtered = list.filter(p => p.id !== id);
  saveLocalData("portfolio_projects", filtered);

  if (isFallbackMode) return;

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
    const versionKey = "portfolio_blogs_version";
    const savedVersion = localStorage.getItem(versionKey);
    const needsUpdate = savedVersion !== DATA_VERSION;

    const querySnapshot = await withTimeout(getDocs(collection(db, "blogs")), 8000);
    const blogs: Blog[] = [];
    querySnapshot.forEach((doc) => {
      blogs.push({ ...doc.data() } as Blog);
    });

    // If version changed, refresh default blogs with latest content
    const deletedDefaults = JSON.parse(localStorage.getItem("portfolio_deleted_default_blogs") || "[]");
    for (const def of DEFAULT_BLOGS) {
      if (deletedDefaults.includes(def.id)) continue;
      const match = blogs.findIndex(b => b.id === def.id);
      if (match === -1) {
        blogs.push(def);
      } else if (needsUpdate) {
        blogs[match] = { ...def };
      }
    }

    if (blogs.length > 0) {
      const sortedBlogs = blogs.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      saveLocalData("portfolio_blogs", sortedBlogs);
      return sortedBlogs;
    }
    for (const blog of DEFAULT_BLOGS) {
      await saveBlog(blog);
    }
    return [...DEFAULT_BLOGS].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  } catch (err) {
    console.error("Firestore blogs read error, falling back to LocalStorage:", err);
    const local = getLocalData("portfolio_blogs", DEFAULT_BLOGS);
    return local.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
}

export async function saveBlog(blog: Blog): Promise<void> {
  // Always update LocalStorage cache first
  const list = getLocalData("portfolio_blogs", DEFAULT_BLOGS);
  const index = list.findIndex(b => b.id === blog.id);
  if (index > -1) list[index] = blog;
  else list.push(blog);
  saveLocalData("portfolio_blogs", list);

  if (isFallbackMode) return;

  try {
    await withTimeout(setDoc(doc(db, "blogs", blog.id), blog), 15000);
  } catch (err) {
    console.error("Firestore blog write error:", err);
    throw err;
  }
}

export async function deleteBlog(id: string): Promise<void> {
  // Always update LocalStorage cache first
  const list = getLocalData("portfolio_blogs", DEFAULT_BLOGS);
  const filtered = list.filter(b => b.id !== id);
  saveLocalData("portfolio_blogs", filtered);

  // Track permanently deleted default blogs so they aren't re-added
  const defaultIds = new Set(DEFAULT_BLOGS.map(b => b.id));
  if (defaultIds.has(id)) {
    const deleted = JSON.parse(localStorage.getItem("portfolio_deleted_default_blogs") || "[]");
    if (!deleted.includes(id)) {
      deleted.push(id);
      localStorage.setItem("portfolio_deleted_default_blogs", JSON.stringify(deleted));
    }
  }

  if (isFallbackMode) return;

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
      saveLocalData("portfolio_media", DEFAULT_MEDIA);
      return DEFAULT_MEDIA;
    }
    saveLocalData("portfolio_media", media); // Sync to local storage
    return media;
  } catch (err) {
    console.error("Firestore media read error, falling back to LocalStorage:", err);
    return getLocalData("portfolio_media", DEFAULT_MEDIA);
  }
}

export async function saveMediaItem(item: MediaItem): Promise<void> {
  // Always update LocalStorage cache first
  const list = getLocalData("portfolio_media", DEFAULT_MEDIA);
  const index = list.findIndex(m => m.id === item.id);
  if (index > -1) list[index] = item;
  else list.push(item);
  saveLocalData("portfolio_media", list);

  if (isFallbackMode) return;

  try {
    await setDoc(doc(db, "media", item.id), item);
  } catch (err) {
    console.error("Firestore media write error:", err);
    throw err;
  }
}

export async function deleteMediaItem(id: string): Promise<void> {
  // Always update LocalStorage cache first
  const list = getLocalData("portfolio_media", DEFAULT_MEDIA);
  const filtered = list.filter(m => m.id !== id);
  saveLocalData("portfolio_media", filtered);

  if (isFallbackMode) return;

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
    const querySnapshot = await withTimeout(getDocs(collection(db, "config")), 8000);
    let cv: CVData | null = null;
    querySnapshot.forEach((doc) => {
      if (doc.id === "cv") {
        cv = { ...doc.data() } as CVData;
      }
    });
    if (cv) {
      localStorage.setItem("portfolio_cv", JSON.stringify(cv)); // Sync to local storage
    }
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
  // Always update LocalStorage cache first
  localStorage.setItem("portfolio_cv", JSON.stringify(cvDoc));

  if (isFallbackMode) return;

  try {
    await withTimeout(setDoc(doc(db, "config", "cv"), cvDoc), 15000);
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
    const querySnapshot = await withTimeout(getDocs(collection(db, "education")), 8000);
    const education: EducationExperience[] = [];
    querySnapshot.forEach((doc) => {
      education.push({ ...doc.data() } as EducationExperience);
    });
    if (education.length === 0) {
      for (const edu of DEFAULT_EDUCATION) {
        await saveEducationExperience(edu);
      }
      saveLocalData("portfolio_education", DEFAULT_EDUCATION);
      return [...DEFAULT_EDUCATION].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    const sortedEdu = education.sort((a, b) => a.sortOrder - b.sortOrder);
    saveLocalData("portfolio_education", sortedEdu); // Sync to local storage
    return sortedEdu;
  } catch (err) {
    console.error("Firestore education read error, falling back to LocalStorage:", err);
    const local = getLocalData("portfolio_education", DEFAULT_EDUCATION);
    return local.sort((a, b) => a.sortOrder - b.sortOrder);
  }
}

export async function saveEducationExperience(entry: EducationExperience): Promise<void> {
  // Always update LocalStorage cache first
  const list = getLocalData("portfolio_education", DEFAULT_EDUCATION);
  const index = list.findIndex(e => e.id === entry.id);
  if (index > -1) list[index] = entry;
  else list.push(entry);
  saveLocalData("portfolio_education", list);

  if (isFallbackMode) return;

  try {
    await withTimeout(setDoc(doc(db, "education", entry.id), entry), 15000);
  } catch (err) {
    console.error("Firestore education write error:", err);
    throw err;
  }
}

export async function deleteEducationExperience(id: string): Promise<void> {
  // Always update LocalStorage cache first
  const list = getLocalData("portfolio_education", DEFAULT_EDUCATION);
  const filtered = list.filter(e => e.id !== id);
  saveLocalData("portfolio_education", filtered);

  if (isFallbackMode) return;

  try {
    await deleteDoc(doc(db, "education", id));
  } catch (err) {
    console.error("Firestore education delete error:", err);
    throw err;
  }
}


