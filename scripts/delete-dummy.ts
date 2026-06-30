import { initializeApp } from "firebase/app";
import { getFirestore, doc, deleteDoc } from "firebase/firestore";
import * as dotenv from "dotenv";

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteDummies() {
  console.log("Deleting dummy projects proj-01 to proj-12...");
  for (let i = 1; i <= 12; i++) {
    const id = `proj-${i.toString().padStart(2, '0')}`;
    try {
      await deleteDoc(doc(db, "projects", id));
      console.log(`Deleted ${id}`);
    } catch (e) {
      console.log(`Failed to delete ${id}:`, e);
    }
  }
  console.log("Done.");
}

deleteDummies();
