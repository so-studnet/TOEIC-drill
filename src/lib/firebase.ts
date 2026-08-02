import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const app = getApps().length
  ? getApp()
  : initializeApp({ databaseURL: process.env.FIREBASE_DATABASE_URL });

export const db = getDatabase(app);
