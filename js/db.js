// ── Firebase Firestore wrapper ─────────────────────────────────────────────
// Collections:
//   sessions  — one doc per interview session       (id = sessId)
//   answers   — one doc per saved answer            (id = sessId_qIdx)
//   config    — shared app config: lpData, panelists (id = 'lpData' | 'panelists')

import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, setDoc, getDocs,
         collection, query, where, writeBatch }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            "AIzaSyDAvxjowog8dWpO6hxEu3zcyBFI0oAcfgI",
  authDomain:        "aagna-lp-interview.firebaseapp.com",
  projectId:         "aagna-lp-interview",
  storageBucket:     "aagna-lp-interview.firebasestorage.app",
  messagingSenderId: "791245265549",
  appId:             "1:791245265549:web:378482f2e47de856bda0c4"
};

const _fbApp = initializeApp(firebaseConfig);
const _db    = getFirestore(_fbApp);

// ── Helper: get document id for any collection ─────────────────────────────
function _docId(store, obj) {
  if (store === 'answers') return `${obj.sessionId}_${obj.questionIndex}`;
  return obj.id;  // sessions and config both have an 'id' field
}

// ── initDB — kept for compatibility, nothing needed for Firestore ───────────
function initDB() {
  console.log('✓ Firestore connected:', firebaseConfig.projectId);
}

// ── dbPut — create or overwrite a document ─────────────────────────────────
async function dbPut(store, obj) {
  try {
    const id  = _docId(store, obj);
    const ref = doc(_db, store, id);
    await setDoc(ref, obj, { merge: true });
    console.log(`dbPut OK [${store}/${id}]`);
  } catch (e) {
    console.error(`dbPut FAILED [${store}]:`, e.message);
  }
}

// ── dbGetAll — fetch all documents from a collection ───────────────────────
async function dbGetAll(store, cb) {
  try {
    const snap    = await getDocs(collection(_db, store));
    const results = snap.docs.map(d => d.data());
    console.log(`dbGetAll [${store}]: ${results.length} docs`);
    cb(results);
  } catch (e) {
    console.error(`dbGetAll FAILED [${store}]:`, e.message);
    cb([]);
  }
}

// ── dbGetByIdx — fetch answers for a specific session ──────────────────────
async function dbGetByIdx(store, indexName, val, cb) {
  try {
    // 'sid' is the legacy index name from IndexedDB — maps to 'sessionId' field
    const field = (indexName === 'sid') ? 'sessionId' : indexName;
    const q     = query(collection(_db, store), where(field, '==', val));
    const snap  = await getDocs(q);
    const results = snap.docs.map(d => d.data());
    console.log(`dbGetByIdx [${store}] where ${field}==${val}: ${results.length} docs`);
    cb(results);
  } catch (e) {
    console.error(`dbGetByIdx FAILED [${store}]:`, e.message);
    cb([]);
  }
}

// ── dbClear — delete ALL documents in a collection ─────────────────────────
async function dbClear(store) {
  try {
    const snap  = await getDocs(collection(_db, store));
    const batch = writeBatch(_db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    console.log(`dbClear OK [${store}]: ${snap.docs.length} docs deleted`);
  } catch (e) {
    console.error(`dbClear FAILED [${store}]:`, e.message);
  }
}

// ── saveAns — upsert an answer (same session+question always overwrites) ────
async function saveAns(ans) {
  await dbPut('answers', ans);
}

// ── Expose all functions as window globals so app.js can call them ─────────
window.initDB     = initDB;
window.dbPut      = dbPut;
window.dbGetAll   = dbGetAll;
window.dbGetByIdx = dbGetByIdx;
window.dbClear    = dbClear;
window.saveAns    = saveAns;

console.log('✓ db.js module loaded — Firebase functions exposed to window');
