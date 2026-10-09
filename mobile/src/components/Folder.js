import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { F } from '../lib/theme';

// Same folder art as the web: tab, back panel, poster tucked inside, solid tinted pocket
export default function Folder({ poster, accent, count, locked }) {
  return (
    <View style={{ width: '100%', aspectRatio: 5 / 6 }}>
      <View style={[styles.tab, { backgroundColor: `${accent}55` }]} />
      <LinearGradient colors={[`${accent}55`, `${accent}22`, 'rgba(255,255,255,0.04)']} style={[styles.back, { borderColor: `${accent}40` }]} />
      {poster ? (
        <View style={styles.photo}><Image source={{ uri: poster }} style={StyleSheet.absoluteFill} contentFit="cover" /></View>
      ) : (
        <View style={styles.icon}><Feather name="folder" size={20} color={accent} /></View>
      )}
      <View style={[styles.pocket, { borderTopColor: `${accent}aa` }]}>
        <LinearGradient colors={[`${accent}30`, `${accent}0d`]} style={StyleSheet.absoluteFill} />
        {count != null && <Text style={styles.count}>{count} title{count === 1 ? '' : 's'}</Text>}
        {locked && <View style={styles.lock}><Feather name="lock" size={9} color="rgba(255,255,255,0.85)" /></View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tab: { position: 'absolute', left: 0, top: 0, width: '42%', height: '12%', borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  back: { position: 'absolute', left: 0, right: 0, top: '7%', bottom: 0, borderRadius: 12, borderWidth: 1 },
  photo: { position: 'absolute', left: '10%', right: '10%', top: '12%', bottom: '22%', borderRadius: 5, overflow: 'hidden', transform: [{ rotate: '-2deg' }] },
  icon: { position: 'absolute', left: 0, right: 0, top: '14%', bottom: '40%', alignItems: 'center', justifyContent: 'center' },
  pocket: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%', borderRadius: 12, overflow: 'hidden', backgroundColor: '#14141B', borderTopWidth: 1.5 },
  count: { position: 'absolute', left: 9, bottom: 8, fontFamily: F.bold, fontSize: 10, color: 'rgba(255,255,255,0.85)' },
  lock: { position: 'absolute', right: 7, bottom: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
});
