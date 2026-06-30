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

const PROJECTS: Project[] = [];

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
