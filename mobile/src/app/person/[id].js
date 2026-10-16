import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import ProfileView from '../../components/ProfileView';
import { Spinner } from '../../components/Ui';
import { useApi } from '../../lib/api';
import { T } from '../../lib/theme';

// Accepts a user id or a @handle (from mentions and shared /u/ links)
export default function Person() {
  const { id } = useLocalSearchParams();
  const api = useApi();
  const raw = String(id || '').replace(/^@/, '');
  const [uid, setUid] = useState(raw.startsWith('user_') ? raw : null);
  useEffect(() => {
    if (uid || !raw) return;
    api.get(`/api/users/${encodeURIComponent(raw)}`).then((d) => setUid(d.user_id || raw)).catch(() => setUid(raw));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);
  if (!uid) return <View style={{ flex: 1, backgroundColor: T.bg, justifyContent: 'center' }}><Spinner /></View>;
  return <ProfileView userId={uid} onBack={() => router.back()} />;
}
