import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("Firebase config is missing in environment variables!");
  process.exit(1);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface Project {
  id: string;
  title: string;
  category: string;
  year: string;
  description: string;
  tags: string[];
  link?: string;
  image?: string;
  sortOrder?: number;
}

const PROJECTS: Project[] = [
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
  },
  {
    id: "proj-05",
    title: "resume",
    category: "GitHub Project",
    year: "2026",
    description: "A digital brutalist-inspired interactive developer resume and dynamic portfolio system.",
    tags: ["TypeScript", "React", "Vite", "Firebase"],
    link: "https://github.com/MilesDao/resume",
    image: "/assets/project_visual.png",
    sortOrder: 5
  },
  {
    id: "proj-06",
    title: "MilesDao",
    category: "GitHub Project",
    year: "2026",
    description: "Personal profile and repository index highlighting active computational research.",
    tags: ["Markdown"],
    link: "https://github.com/MilesDao/MilesDao",
    image: "/assets/project_visual.png",
    sortOrder: 6
  },
  {
    id: "proj-07",
    title: "Face-Recognition-Attendance-System-KNN-SVM",
    category: "Computer Vision",
    year: "2026",
    description: "An automated attendance tracking system based on face recognition using KNN and SVM models.",
    tags: ["Python", "Computer Vision", "KNN", "SVM", "Jupyter Notebook"],
    link: "https://github.com/MilesDao/Face-Recognition-Attendance-System-KNN-SVM",
    sortOrder: 7
  },
  {
    id: "proj-08",
    title: "Vietnam-traffic-signs-classification",
    category: "Deep Learning",
    year: "2026",
    description: "A classification system using computer vision to identify Vietnamese traffic signs.",
    tags: ["Python", "Deep Learning", "CNN"],
    link: "https://github.com/MilesDao/Vietnam-traffic-signs-classification",
    sortOrder: 8
  },
  {
    id: "proj-09",
    title: "U-pose-3d-sam3d",
    category: "GitHub Project",
    year: "2026",
    description: "Research repository on 3D pose estimation and Segment Anything (SAM) implementation.",
    tags: ["Python"],
    link: "https://github.com/MilesDao/U-pose-3d-sam3d",
    image: "/assets/project_visual.png",
    sortOrder: 9
  },
  {
    id: "proj-10",
    title: "FlappyBird-Pose-Controlled",
    category: "Interactive Vision",
    year: "2026",
    description: "An interactive vision-based game where the classic Flappy Bird is controlled through body pose estimation and gesture tracking.",
    tags: ["Python", "OpenCV", "MediaPipe", "Pygame"],
    link: "https://github.com/MilesDao/FlappyBird-Pose-Controlled",
    sortOrder: 10
  },
  {
    id: "proj-11",
    title: "facebook-chatbot-rag",
    category: "Natural Language Processing",
    year: "2026",
    description: "A Facebook Messenger chatbot using Retrieval-Augmented Generation (RAG) for smart contextual replies.",
    tags: ["Python", "RAG", "LLM", "Facebook API"],
    link: "https://github.com/MilesDao/facebook-chatbot-rag",
    sortOrder: 11
  },
  {
    id: "proj-12",
    title: "USTH_chatbot_Rag",
    category: "Natural Language Processing",
    year: "2026",
    description: "An intelligent RAG chatbot tailored for University of Science and Technology of Hanoi (USTH) questions.",
    tags: ["Python", "RAG", "LLM", "ChromaDB", "USTH"],
    link: "https://github.com/MilesDao/USTH_chatbot_Rag",
    sortOrder: 12
  }
];

async function sync() {
  console.log(`Syncing ${PROJECTS.length} projects to Firestore...`);
  try {
    for (const proj of PROJECTS) {
      console.log(`Saving ${proj.title} (ID: ${proj.id})...`);
      // Since some properties might be undefined, Firestore setDoc needs clean JS objects
      const cleanProj = JSON.parse(JSON.stringify(proj));
      await setDoc(doc(db, "projects", proj.id), cleanProj);
    }
    console.log("Database sync completed successfully!");
  } catch (error) {
    console.error("Error syncing database:", error);
    process.exit(1);
  }
}

sync();
