import { router } from 'expo-router';
import StatusScreen from '../components/StatusScreen';

// Any broken or old link lands here instead of Expo's default "Unmatched route" page
export default function NotFound() {
  return (
    <StatusScreen icon="film" title="This scene got cut" body="That page doesn’t exist any more — the link may be old or mistyped."
      primary={{ label: 'Back to your feed', onPress: () => router.replace('/') }}
      secondary={router.canGoBack() ? { label: 'Go back', onPress: () => router.back() } : null} />
  );
}
