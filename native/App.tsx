import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fetchIndex } from '../src/features/routes/published/fetch-index';
import type { Index } from '../src/features/routes/published/index-schema';
import { setMapFileOrigin } from '../src/features/routes/published/map-file';

/** Our own tiles and style (ADR 0007), the same the web map reads. */
const STYLE_URL = 'https://para-tiles.para-ph-info.workers.dev/styles/liberty';
// The published map (ADR 0001), read by the web's own reader from the site: the index carries
// every direction's overview line. No store yet, so offline there is no copy (ticket 06).
setMapFileOrigin('https://www.para-commute.org');
const MANILA: [number, number] = [121.03, 14.6];
const BRAND = '#4900be'; // parabrand/800, as the web's selected route line

type Timing = { style?: number; index?: number; drawn?: number; error?: string };

/**
 * Commuter-app ticket 02, the native map spike: can Expo with MapLibre React Native show Para's
 * map as the web does? Our style and tiles, every published direction as one line layer, read
 * with the web's own reader, and the load times on screen for the ticket's numbers.
 */
export default function App() {
  const startedAt = useRef(Date.now());
  const [index, setIndex] = useState<Index | null>(null);
  const [timing, setTiming] = useState<Timing>({});
  const since = () => Date.now() - startedAt.current;

  useEffect(() => {
    fetchIndex()
      .then((file) => {
        setIndex(file);
        setTiming((t) => ({ ...t, index: since() }));
      })
      .catch((error: unknown) => setTiming((t) => ({ ...t, error: String(error) })));
  }, []);

  const routes = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: (index?.directions ?? []).flatMap((direction) =>
        direction.shape
          ? [{ type: 'Feature', properties: { id: direction.id }, geometry: direction.shape }]
          : [],
      ),
    }),
    [index],
  );

  return (
    <View style={styles.page}>
      <Map
        style={styles.page}
        mapStyle={STYLE_URL}
        onDidFinishLoadingStyle={() => setTiming((t) => ({ ...t, style: since() }))}
        onDidFinishRenderingMapFully={() =>
          index && setTiming((t) => (t.drawn ? t : { ...t, drawn: since() }))
        }
        onDidFailLoadingMap={() => setTiming((t) => ({ ...t, error: 'The style did not load.' }))}
      >
        <Camera initialViewState={{ center: MANILA, zoom: 11 }} />
        <GeoJSONSource id="routes" data={routes}>
          <Layer
            id="routes-line"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': BRAND, 'line-width': 2.5, 'line-opacity': 0.8 }}
          />
        </GeoJSONSource>
      </Map>
      <View style={styles.panel} pointerEvents="none">
        <Text style={styles.text}>Style: {timing.style ?? '…'} ms</Text>
        <Text style={styles.text}>
          Routes: {index ? `${routes.features.length} lines, ${timing.index} ms` : '…'}
        </Text>
        <Text style={styles.text}>Drawn: {timing.drawn ?? '…'} ms</Text>
        {timing.error && <Text style={styles.error}>{timing.error}</Text>}
      </View>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  panel: {
    position: 'absolute',
    top: 56,
    left: 16,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  text: { fontSize: 13, color: '#171717' },
  error: { fontSize: 13, color: '#9f0712' },
});
