const admin = require('firebase-admin');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');

admin.initializeApp();
const db = admin.firestore();

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const TWENTY_FIVE_MILES = 25;
const ALERT_DAYS = new Set([60, 30, 7]);

const CREDENTIAL_LABELS = {
  license: 'Nursing License',
  certification: 'Professional Certification',
  bls: 'BLS Certification',
  acls: 'ACLS Certification',
  tbTest: 'TB Test',
  fluShot: 'Flu Vaccination',
  backgroundCheck: 'Background Check'
};

function tokensFor(record = {}) {
  return [...(record.fcmTokens || []), record.fcmToken].filter(Boolean);
}

async function sendEachToken(tokens, notification, data = {}) {
  const cleanTokens = [...new Set((tokens || []).filter(Boolean))];
  if (!cleanTokens.length) return null;
  return admin.messaging().sendEachForMulticast({
    tokens: cleanTokens,
    notification,
    data: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)]))
  });
}

function haversineMiles(a, b) {
  if (!a?.latitude || !a?.longitude || !b?.latitude || !b?.longitude) return Number.MAX_SAFE_INTEGER;
  const r = 3958.8;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function credentialCopy(label, days) {
  if (days === 60) return `Your ${label} expires in 60 days. Renew early to stay shift-ready.`;
  if (days === 30) return `Your ${label} expires in 30 days. Upload your renewal in PulseShift.`;
  if (days === 7) return `Your ${label} expires in 7 days. Act now to avoid losing shift access.`;
  return `Your ${label} expired today. Your profile is paused until you upload a renewal.`;
}

exports.notifyFacilityOnClaim = onDocumentUpdated('shifts/{shiftId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (before.status !== 'open' || after.status !== 'claimed' || !after.claimedBy) return;

  const [facilitySnap, workerSnap] = await Promise.all([
    db.collection('facilities').doc(after.facilityId).get(),
    db.collection('workers').doc(after.claimedBy).get()
  ]);
  if (!facilitySnap.exists) return;

  await sendEachToken(tokensFor(facilitySnap.data()), {
    title: 'Shift claimed',
    body: `${workerSnap.data()?.name || 'A clinician'} claimed your ${after.role} shift.`
  }, { shiftId: event.params.shiftId, type: 'shift_claimed' });
});

exports.shiftCancellationLock = onDocumentUpdated('shifts/{shiftId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (before.status === 'cancelled' || after.status !== 'cancelled') return;
  if (!after.claimedBy || after.lockGuaranteePaid) return;

  const shiftStart = after.startTime?.toMillis?.() || 0;
  if (shiftStart - Date.now() > FOUR_HOURS_MS) return;

  const hours = after.lockGuaranteeHours || 2;
  const amount = hours * after.hourlyRate;
  const workerRef = db.collection('workers').doc(after.claimedBy);
  const workerSnap = await workerRef.get();

  await Promise.all([
    event.data.after.ref.update({
      lockGuaranteePaid: true,
      lockGuaranteePaidAt: admin.firestore.FieldValue.serverTimestamp(),
      lockGuaranteePayout: amount
    }),
    db.collection('payouts').add({
      workerId: after.claimedBy,
      shiftId: event.params.shiftId,
      type: 'lock_guarantee',
      amount,
      status: 'pending_stripe_payout',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }),
    sendEachToken(tokensFor(workerSnap.data()), {
      title: 'Lock-in payment started',
      body: `Your shift was cancelled. Your lock-in payment of $${amount} is on its way.`
    }, { shiftId: event.params.shiftId, type: 'lock_guarantee_paid', amount })
  ]);
});

exports.credentialExpirationAlerts = onSchedule('0 8 * * *', async () => {
  const workers = await db.collection('workers').where('isActive', '==', true).get();
  const work = [];
  workers.forEach((doc) => {
    const worker = doc.data();
    const updates = {};
    let pause = false;
    Object.entries(worker.credentials || {}).forEach(([key, credential]) => {
      if (!credential?.expiresAt?.toMillis) return;
      const label = CREDENTIAL_LABELS[key] || key;
      const days = Math.ceil((credential.expiresAt.toMillis() - Date.now()) / DAY_MS);
      if (ALERT_DAYS.has(days)) {
        work.push(sendEachToken(tokensFor(worker), { title: 'Credential expiring', body: credentialCopy(label, days) }, { type: 'credential_expiring', credential: key, days }));
      }
      if (days <= 0 && credential.status !== 'expired') {
        updates[`credentials.${key}.status`] = 'expired';
        pause = true;
        work.push(sendEachToken(tokensFor(worker), { title: 'Credential expired', body: credentialCopy(label, 0) }, { type: 'credential_expired', credential: key }));
      }
    });
    if (pause) work.push(doc.ref.update({ ...updates, isActive: false, pausedAt: admin.firestore.FieldValue.serverTimestamp() }));
  });
  await Promise.all(work);
});

exports.notifyUrgentOpenShifts = onSchedule('every 15 minutes', async () => {
  const now = admin.firestore.Timestamp.now();
  const soon = admin.firestore.Timestamp.fromMillis(Date.now() + SIX_HOURS_MS);
  const shifts = await db.collection('shifts').where('status', '==', 'open').where('startTime', '>=', now).where('startTime', '<=', soon).get();
  const work = [];
  for (const shiftDoc of shifts.docs) {
    const shift = shiftDoc.data();
    const workers = await db.collection('workers').where('role', '==', shift.role).where('isActive', '==', true).get();
    const tokens = [];
    workers.forEach((workerDoc) => {
      const worker = workerDoc.data();
      if (haversineMiles(worker, shift) <= TWENTY_FIVE_MILES) tokens.push(...tokensFor(worker));
    });
    work.push(sendEachToken(tokens, { title: 'Urgent shift nearby', body: `${shift.facilityName} needs a ${shift.role} within 6 hours.` }, { shiftId: shiftDoc.id, type: 'urgent_shift' }));
    work.push(shiftDoc.ref.update({ isUrgent: true, urgentNotifiedAt: admin.firestore.FieldValue.serverTimestamp() }));
  }
  await Promise.all(work);
});

exports.notifyFacilityOnWorkerTravel = onDocumentUpdated('shifts/{shiftId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  const onMyWay = !before.onMyWayAt && after.onMyWayAt;
  const clockedIn = !before.clockInAt && after.clockInAt;
  if (!onMyWay && !clockedIn) return;

  const [facilitySnap, workerSnap] = await Promise.all([
    db.collection('facilities').doc(after.facilityId).get(),
    after.claimedBy ? db.collection('workers').doc(after.claimedBy).get() : null
  ]);
  if (!facilitySnap.exists) return;

  const name = workerSnap?.data()?.name || 'Your worker';
  if (onMyWay) {
    await sendEachToken(tokensFor(facilitySnap.data()), { title: 'Worker on the way', body: `${name} is on their way - estimated arrival in ${after.workerEta || '?'} minutes.` }, { shiftId: event.params.shiftId, type: 'worker_on_my_way', workerEta: after.workerEta || '' });
  }
  if (clockedIn) {
    await sendEachToken(tokensFor(facilitySnap.data()), { title: 'Worker clocked in', body: `${name} has arrived and clocked in.` }, { shiftId: event.params.shiftId, type: 'worker_clocked_in' });
  }
});
