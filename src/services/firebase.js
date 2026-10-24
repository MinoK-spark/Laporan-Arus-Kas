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

// Helper to listen to a document with callback
export const subscribeToDoc = (docName, onUpdate, onError) => {
  const docRef = doc(db, 'cashflow_system', docName);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data().payload);
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
    const docRef = doc(db, 'cashflow_system', docName);
    await setDoc(docRef, { 
      payload, 
      lastUpdated: new Date().toISOString() 
    });
    return true;
  } catch (err) {
    console.error(`Gagal menyimpan ke Firestore [${docName}]:`, err);
    throw err;
  }
};
