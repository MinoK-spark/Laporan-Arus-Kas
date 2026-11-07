import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gpe-cashflow-db",
  appId: "1:642574602836:web:26b8ae2d247f27272ad3c1",
  storageBucket: "gpe-cashflow-db.firebasestorage.app",
  apiKey: "AIzaSyAGY_WeOse-mbTjioyyaLwINCK-VaALvpk",
  authDomain: "gpe-cashflow-db.firebaseapp.com",
  messagingSenderId: "642574602836"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Helper untuk membersihkan nilai 'undefined' secara rekursif
// Firestore melarang keras penyimpanan field dengan nilai undefined (Error: Unsupported field value: undefined)
export const sanitizeForFirestore = (val) => {
  if (val === undefined) {
    return null;
  }
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    return val
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item));
  }
  const clean = {};
  for (const [key, value] of Object.entries(val)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean;
};

// Helper to listen to a document with callback
export const subscribeToDoc = (docName, onUpdate, onError) => {
  const docRef = doc(db, 'cashflow_system', docName);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const rawPayload = snapshot.data().payload;
        onUpdate(rawPayload !== undefined ? sanitizeForFirestore(rawPayload) : null);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.warn(`Firestore sync error [${docName}]:`, err);
      if (onError) onError(err);
    }
  );
};

// Helper to save data to a document
export const saveToDoc = async (docName, payload) => {
  try {
    const cleanPayload = sanitizeForFirestore(payload);
    const docRef = doc(db, 'cashflow_system', docName);
    await setDoc(docRef, { 
      payload: cleanPayload, 
      lastUpdated: new Date().toISOString() 
    });
    return true;
  } catch (err) {
    console.error(`Gagal menyimpan ke Firestore [${docName}]:`, err);
    throw err;
  }
};
