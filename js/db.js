// ── Firebase Firestore wrapper ─────────────────────────────────────────────
// Collections:
//   sessions — interview sessions          (id = sessId)
//   answers  — saved answers               (id = sessId_qIdx)
//   config   — shared config: lpData, panelists
//              stored as JSON strings to avoid Firestore nested-key issues

import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, setDoc, getDocs,
         collection, query, where, writeBatch, onSnapshot }
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

// ── initDB ─────────────────────────────────────────────────────────────────
function initDB() {
  console.log('✓ Firestore connected:', firebaseConfig.projectId);
}

// ── dbPut ──────────────────────────────────────────────────────────────────
async function dbPut(store, obj) {
  try {
    let docId;
    if      (store === 'answers') docId = `${obj.sessionId}_${obj.questionIndex}`;
    else if (store === 'config')  docId = obj.id;
    else                          docId = obj.id;

    // For config store: serialise 'data' field as JSON string
    // so Firestore doesn't choke on arbitrary object keys
    let toStore = obj;
    if (store === 'config' && obj.data !== undefined) {
      toStore = { ...obj, data: JSON.stringify(obj.data) };
    }

    await setDoc(doc(_db, store, docId), toStore, { merge: true });
    console.log(`✓ dbPut [${store}/${docId}]`);
  } catch (e) {
    console.error(`✗ dbPut [${store}] failed:`, e.message);
  }
}

// ── dbGetAll ───────────────────────────────────────────────────────────────
async function dbGetAll(store, cb) {
  try {
    const snap    = await getDocs(collection(_db, store));
    const results = snap.docs.map(d => {
      const raw = d.data();
      // Deserialise config data field back from JSON string
      if (store === 'config' && typeof raw.data === 'string') {
        try { raw.data = JSON.parse(raw.data); } catch(_) {}
      }
      return raw;
    });
    console.log(`✓ dbGetAll [${store}]: ${results.length} docs`);
    cb(results);
  } catch (e) {
    console.error(`✗ dbGetAll [${store}] failed:`, e.message);
    cb([]);
  }
}

// ── dbGetByIdx ─────────────────────────────────────────────────────────────
async function dbGetByIdx(store, indexName, val, cb) {
  try {
    const field = (indexName === 'sid') ? 'sessionId' : indexName;
    const q     = query(collection(_db, store), where(field, '==', val));
    const snap  = await getDocs(q);
    const results = snap.docs.map(d => d.data());
    console.log(`✓ dbGetByIdx [${store}] ${field}==${val}: ${results.length} docs`);
    cb(results);
  } catch (e) {
    console.error(`✗ dbGetByIdx [${store}] failed:`, e.message);
    cb([]);
  }
}

// ── dbClear ────────────────────────────────────────────────────────────────
async function dbClear(store) {
  try {
    const snap  = await getDocs(collection(_db, store));
    const batch = writeBatch(_db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    console.log(`✓ dbClear [${store}]: ${snap.docs.length} docs deleted`);
  } catch (e) {
    console.error(`✗ dbClear [${store}] failed:`, e.message);
  }
}

// ── saveAns ────────────────────────────────────────────────────────────────
async function saveAns(ans) {
  await dbPut('answers', ans);
}

// ── listenConfig ───────────────────────────────────────────────────────────
// Real-time listener on the config collection.
// Fires immediately with current data, then again whenever any config doc changes.
// cb receives array of decoded config docs.
function listenConfig(cb) {
  return onSnapshot(collection(_db, 'config'), snap => {
    const results = snap.docs.map(d => {
      const raw = d.data();
      if (typeof raw.data === 'string') {
        try { raw.data = JSON.parse(raw.data); } catch(_) {}
      }
      return raw;
    });
    console.log(`↻ listenConfig: ${results.length} config docs`);
    cb(results);
  }, e => {
    console.error('✗ listenConfig failed:', e.message);
  });
}

// ── Expose globals ─────────────────────────────────────────────────────────
window.initDB       = initDB;
window.dbPut        = dbPut;
window.dbGetAll     = dbGetAll;
window.dbGetByIdx   = dbGetByIdx;
window.dbClear      = dbClear;
window.saveAns      = saveAns;
window.listenConfig = listenConfig;

console.log('✓ db.js loaded — Firebase ready');
