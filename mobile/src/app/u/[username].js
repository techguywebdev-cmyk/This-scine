import { Redirect, useLocalSearchParams } from 'expo-router';

// Shared profile links (/u/handle) and @mentions open the profile in the app
export default function ProfileLink() {
  const { username } = useLocalSearchParams();
  if (!username) return <Redirect href="/" />;
  return <Redirect href={{ pathname: '/person/[id]', params: { id: String(username) } }} />;
}
