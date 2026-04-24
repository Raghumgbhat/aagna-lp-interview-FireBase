// ── Firebase Firestore wrapper ─────────────────────────────────────────────
// Replaces IndexedDB. All function signatures are identical to the old db.js
// so app.js requires zero changes.
//
// Collections in Firestore:
//   sessions  — one document per interview session (id = sessId)
//   answers   — one document per saved answer (id = sessId_qIdx)

import { initializeApp }                          from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, setDoc, getDoc,
         getDocs, collection, query, where,
         deleteDoc, writeBatch }                   from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            "AIzaSyDAvxjowog8dWpO6hxEu3zcyBFI0oAcfgI",
  authDomain:        "aagna-lp-interview.firebaseapp.com",
  projectId:         "aagna-lp-interview",
  storageBucket:     "aagna-lp-interview.firebasestorage.app",
  messagingSenderId: "791245265549",
  appId:             "1:791245265549:web:378482f2e47de856bda0c4"
};

const _app = initializeApp(firebaseConfig);
const _db  = getFirestore(_app);

// ── keep a tiny in-memory cache so PDF export works immediately after save ──
const _cache = { sessions: {}, answers: {} };

// ── initDB — nothing to do for Firestore, kept for compatibility ────────────
function initDB() {
  console.log('Firestore ready');
}

// ── dbPut — upsert a document ───────────────────────────────────────────────
// store = 'sessions' | 'answers'
// obj must have an 'id' field for sessions; answers use sessId_qIdx as id
async function dbPut(store, obj) {
  try {
    const docId = store === 'answers'
      ? `${obj.sessionId}_${obj.questionIndex}`
      : obj.id;
    const ref = doc(_db, store, docId);
    await setDoc(ref, obj, { merge: true });
    _cache[store][docId] = obj;
  } catch (e) {
    console.error('dbPut error', e);
  }
}

// ── dbGetAll — get all documents in a collection ────────────────────────────
async function dbGetAll(store, cb) {
  try {
    const snap = await getDocs(collection(_db, store));
    const results = snap.docs.map(d => d.data());
    // update cache
    results.forEach(r => {
      const id = store === 'answers' ? `${r.sessionId}_${r.questionIndex}` : r.id;
      _cache[store][id] = r;
    });
    cb(results);
  } catch (e) {
    console.error('dbGetAll error', e);
    cb([]);
  }
}

// ── dbGetByIdx — get answers by sessionId ───────────────────────────────────
async function dbGetByIdx(store, indexName, val, cb) {
  try {
    const q   = query(collection(_db, store), where(indexName === 'sid' ? 'sessionId' : indexName, '==', val));
    const snap = await getDocs(q);
    const results = snap.docs.map(d => d.data());
    cb(results);
  } catch (e) {
    console.error('dbGetByIdx error', e);
    cb([]);
  }
}

// ── dbClear — delete all documents in a collection ─────────────────────────
async function dbClear(store) {
  try {
    const snap  = await getDocs(collection(_db, store));
    const batch = writeBatch(_db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    _cache[store] = {};
  } catch (e) {
    console.error('dbClear error', e);
  }
}

// ── saveAns — upsert an answer document ────────────────────────────────────
// Uses sessId_qIdx as the document id so re-saving the same question
// always overwrites rather than creating duplicates.
async function saveAns(ans) {
  await dbPut('answers', ans);
}

// ── expose globals so app.js (non-module script) can call them ─────────────
window.initDB      = initDB;
window.dbPut       = dbPut;
window.dbGetAll    = dbGetAll;
window.dbGetByIdx  = dbGetByIdx;
window.dbClear     = dbClear;
window.saveAns     = saveAns;
