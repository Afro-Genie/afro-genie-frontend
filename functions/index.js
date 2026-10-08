const admin = require('firebase-admin');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');

admin.initializeApp();

const createCompletionNotification = async (collectionName, after) => {
  if (!after?.status || after.status !== 'completed') return;
  const userId = after.userId;
  if (!userId) return;

  const title =
    collectionName === 'songRequests'
      ? 'Song request completed'
      : 'Translation request completed';
  const message =
    collectionName === 'songRequests'
      ? `"${after.songTitle}" by ${after.artist} is now available.`
      : `Translation for "${after.songTitle}" by ${after.artist} has been completed.`;

  await admin.firestore().collection('notifications').add({
    userId,
    title,
    message,
    type: 'request-completed',
    sourceCollection: collectionName,
    sourceId: after.id || null,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

exports.onSongRequestUpdated = onDocumentUpdated(
  { document: 'songRequests/{requestId}', region: 'us-central1' },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;
    if (before.status === after.status) return;
    await createCompletionNotification('songRequests', { ...after, id: event.params.requestId });
  }
);

exports.onTranslationRequestUpdated = onDocumentUpdated(
  { document: 'translationRequests/{requestId}', region: 'us-central1' },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;
    if (before.status === after.status) return;
    await createCompletionNotification('translationRequests', { ...after, id: event.params.requestId });
  }
);
