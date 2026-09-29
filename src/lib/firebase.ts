import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User as FirebaseUser } from "firebase/auth";
import { getFirestore, doc, getDocFromServer, setDoc, collection, getDocs } from "firebase/firestore";
import firebaseAppletConfig from "../../firebase-applet-config.json";

const env = (import.meta as any).env || {};

// Public Firebase Web SDK configuration (safe for client bundle; enforced via Firestore Security Rules)
const firebaseConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId,
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  firestoreDatabaseId:
    env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
  messagingSenderId:
    env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
  measurementId: firebaseAppletConfig.measurementId,
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific databaseId as mandated
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot as mandated by skill
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Please check your Firebase configuration.");
    }
  }
}

testFirestoreConnection();

/**
 * Sign in using Google popup (preferred method for container/preview environments)
 */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Sign out from Firebase Auth
 */
export async function logOutFromFirebase(): Promise<void> {
  await signOut(auth);
}

/**
 * Synchronize candidate analysis to cloud Firestore
 */
export async function syncAnalysisToFirestore(userId: string, analysis: any) {
  const effectiveUserId = auth.currentUser?.uid || userId;
  if (!auth.currentUser || !effectiveUserId || !analysis?.id) {
    return;
  }
  const path = `users/${effectiveUserId}/analyses/${analysis.id}`;
  try {
    const cleanPayload = JSON.parse(JSON.stringify(analysis));
    await setDoc(doc(db, "users", effectiveUserId, "analyses", analysis.id), {
      ...cleanPayload,
      userId: effectiveUserId,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Synchronize generated resume to cloud Firestore
 */
export async function syncResumeToFirestore(userId: string, resume: any) {
  const effectiveUserId = auth.currentUser?.uid || userId;
  if (!auth.currentUser || !effectiveUserId || !resume?.id) {
    return;
  }
  const path = `users/${effectiveUserId}/resumes/${resume.id}`;
  try {
    const cleanPayload = JSON.parse(JSON.stringify(resume));
    await setDoc(doc(db, "users", effectiveUserId, "resumes", resume.id), {
      ...cleanPayload,
      userId: effectiveUserId,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Fetch candidate analyses from cloud Firestore
 */
export async function fetchUserAnalysesFromFirestore(userId: string) {
  const effectiveUserId = auth.currentUser?.uid || userId;
  if (!auth.currentUser || !effectiveUserId) {
    return [];
  }
  const path = `users/${effectiveUserId}/analyses`;
  try {
    const colRef = collection(db, "users", effectiveUserId, "analyses");
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((d) => d.data());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

/**
 * Synchronize candidate job application to cloud Firestore
 */
export async function syncJobApplicationToFirestore(userId: string, application: any) {
  const effectiveUserId = auth.currentUser?.uid || userId;
  if (!auth.currentUser || !effectiveUserId || !application?.id) {
    return;
  }
  const path = `users/${effectiveUserId}/applications/${application.id}`;
  try {
    // Sanitizing undefined values
    const cleanPayload = JSON.parse(JSON.stringify(application));
    await setDoc(doc(db, "users", effectiveUserId, "applications", application.id), {
      ...cleanPayload,
      userId: effectiveUserId,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Fetch candidate job applications from cloud Firestore
 */
export async function fetchJobApplicationsFromFirestore(userId: string) {
  const effectiveUserId = auth.currentUser?.uid || userId;
  if (!auth.currentUser || !effectiveUserId) {
    return [];
  }
  const path = `users/${effectiveUserId}/applications`;
  try {
    const colRef = collection(db, "users", effectiveUserId, "applications");
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((d) => d.data());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

