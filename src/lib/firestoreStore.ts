import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { DigestTimeframe, DomainSlot, PerspectiveLens } from '../config/site.config';
import { db, handleFirestoreError, OperationType } from './firebaseAuth';

export type AbbotDepthMode = 'quick' | 'balanced' | 'deep';
export type AbbotModality = 'text' | 'voice' | 'transcript';

export interface StoredAbbotThread {
  id: string;
  ownerId: string;
  title: string;
  domainSlot: DomainSlot;
  depthMode: AbbotDepthMode;
  messageCount: number;
}

export interface StoredAbbotMessage {
  id: string;
  ownerId: string;
  threadId: string;
  role: 'user' | 'abbot';
  modality: AbbotModality;
  text: string;
  lens: PerspectiveLens;
}

export interface StoredSavedReading {
  id: string;
  ownerId: string;
  domainSlot: DomainSlot;
  timeframe: DigestTimeframe;
  activeLens: PerspectiveLens;
  promptSummary: string;
  headline: string;
  coreGuidance: string;
}

function clampString(val: string, maxLen: number, fallback = '-'): string {
  const cleaned = val.trim();
  if (!cleaned) return fallback;
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}

function makeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

export async function ensureUserProfile(
  user: User,
  preferredLens: PerspectiveLens = 'thai_folk',
  pdpaAccepted = false
): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    const displayName = clampString(user.displayName || 'โยมผู้มาเยือน', 100, 'โยมผู้มาเยือน');
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        displayName,
        preferredLens,
        pdpaAccepted,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        displayName,
        preferredLens,
        pdpaAccepted: snap.data().pdpaAccepted || pdpaAccepted,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function createAbbotThread(params: {
  uid: string;
  title: string;
  domainSlot: DomainSlot;
  depthMode: AbbotDepthMode;
}): Promise<string> {
  const threadId = makeDocId('thr');
  const path = `users/${params.uid}/abbotThreads/${threadId}`;
  try {
    await setDoc(doc(db, 'users', params.uid, 'abbotThreads', threadId), {
      ownerId: params.uid,
      title: clampString(params.title, 140, 'สนทนากับท่านเจ้าอาวาส'),
      domainSlot: params.domainSlot,
      depthMode: params.depthMode,
      messageCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return threadId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function appendAbbotMessage(params: {
  uid: string;
  threadId: string;
  role: 'user' | 'abbot';
  modality: AbbotModality;
  text: string;
  lens: PerspectiveLens;
}): Promise<string> {
  const messageId = makeDocId('msg');
  const msgPath = `users/${params.uid}/abbotThreads/${params.threadId}/messages/${messageId}`;
  try {
    await setDoc(doc(db, 'users', params.uid, 'abbotThreads', params.threadId, 'messages', messageId), {
      ownerId: params.uid,
      threadId: params.threadId,
      role: params.role,
      modality: params.modality,
      text: clampString(params.text, 4000, '...'),
      lens: params.lens,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'users', params.uid, 'abbotThreads', params.threadId), {
      messageCount: increment(1),
      updatedAt: serverTimestamp(),
    });
    return messageId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, msgPath);
  }
}

export function subscribeAbbotThreads(
  uid: string,
  onData: (threads: StoredAbbotThread[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colPath = `users/${uid}/abbotThreads`;
  const q = query(
    collection(db, 'users', uid, 'abbotThreads'),
    where('ownerId', '==', uid),
    orderBy('updatedAt', 'desc'),
    limit(15)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: StoredAbbotThread[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerId: String(data.ownerId ?? uid),
          title: String(data.title ?? 'บทสนทนา'),
          domainSlot: (data.domainSlot as DomainSlot) ?? 'slot_tarot',
          depthMode: (data.depthMode as AbbotDepthMode) ?? 'balanced',
          messageCount: Number(data.messageCount ?? 0),
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, colPath);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export function subscribeThreadMessages(
  uid: string,
  threadId: string,
  onData: (messages: StoredAbbotMessage[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colPath = `users/${uid}/abbotThreads/${threadId}/messages`;
  const q = query(
    collection(db, 'users', uid, 'abbotThreads', threadId, 'messages'),
    where('ownerId', '==', uid),
    orderBy('createdAt', 'asc'),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: StoredAbbotMessage[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerId: String(data.ownerId ?? uid),
          threadId: String(data.threadId ?? threadId),
          role: data.role === 'user' ? 'user' : 'abbot',
          modality: (data.modality as AbbotModality) ?? 'text',
          text: String(data.text ?? ''),
          lens: (data.lens as PerspectiveLens) ?? 'thai_folk',
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, colPath);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export async function saveReadingDigest(params: {
  uid: string;
  domainSlot: DomainSlot;
  timeframe: DigestTimeframe;
  activeLens: PerspectiveLens;
  promptSummary: string;
  headline: string;
  coreGuidance: string;
}): Promise<string> {
  const readingId = makeDocId('rdg');
  const path = `users/${params.uid}/savedReadings/${readingId}`;
  try {
    await setDoc(doc(db, 'users', params.uid, 'savedReadings', readingId), {
      ownerId: params.uid,
      domainSlot: params.domainSlot,
      timeframe: params.timeframe,
      activeLens: params.activeLens,
      promptSummary: clampString(params.promptSummary, 500, '-'),
      headline: clampString(params.headline, 240, 'บันทึกการสะท้อนใจ'),
      coreGuidance: clampString(params.coreGuidance, 4000, '-'),
      createdAt: serverTimestamp(),
    });
    return readingId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export function subscribeSavedReadings(
  uid: string,
  onData: (readings: StoredSavedReading[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colPath = `users/${uid}/savedReadings`;
  const q = query(
    collection(db, 'users', uid, 'savedReadings'),
    where('ownerId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: StoredSavedReading[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerId: String(data.ownerId ?? uid),
          domainSlot: (data.domainSlot as DomainSlot) ?? 'slot_tarot',
          timeframe: (data.timeframe as DigestTimeframe) ?? 'daily',
          activeLens: (data.activeLens as PerspectiveLens) ?? 'thai_folk',
          promptSummary: String(data.promptSummary ?? ''),
          headline: String(data.headline ?? ''),
          coreGuidance: String(data.coreGuidance ?? ''),
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, colPath);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export async function deleteSavedReading(uid: string, readingId: string): Promise<void> {
  const path = `users/${uid}/savedReadings/${readingId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'savedReadings', readingId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
