import { router, useLocalSearchParams } from 'expo-router';
import ProfileView from '../../components/ProfileView';

export default function Person() {
  const { id } = useLocalSearchParams();
  return <ProfileView userId={String(id)} onBack={() => router.back()} />;
}
