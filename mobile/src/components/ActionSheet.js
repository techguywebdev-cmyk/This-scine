import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Ambient from './Ambient';
import { Poster } from './Ui';
import { F, T } from '../lib/theme';

// Bottom sheet with a title header and a list of actions
export default function ActionSheet({ visible, onClose, poster, title, sub, actions = [], accent = T.accent, children }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
        <Ambient accent={accent} style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }} />
        <View style={styles.grab} />
        {title ? (
          <View style={styles.head}>
            {poster !== undefined ? <Poster uri={poster} width={40} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
              {sub ? <Text style={styles.sub}>{sub}</Text> : null}
            </View>
          </View>
        ) : null}
        {actions.map(([icon, text, fn]) => (
          <Pressable key={text} onPress={() => { onClose(); setTimeout(fn, 120); }} style={({ pressed }) => [styles.action, { opacity: pressed ? 0.7 : 1 }]}>
            <Feather name={icon} size={18} color={accent} />
            <Text style={styles.actionText}>{text}</Text>
          </Pressable>
        ))}
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden', backgroundColor: T.bg },
  grab: { width: 34, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'center', marginBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hairlineStrong },
  title: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  sub: { fontFamily: F.body, fontSize: 12, color: T.text2, marginTop: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hairline },
  actionText: { fontFamily: F.semibold, fontSize: 14.5, color: '#fff' },
});
