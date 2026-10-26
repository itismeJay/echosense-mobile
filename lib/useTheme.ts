import { useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { paletteFor, type Palette } from './theme';

/** Follows the system light or dark setting. */
export function useTheme(): Palette {
  return paletteFor(useColorScheme());
}

/** Build a StyleSheet from the current palette, once per color scheme. */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (palette: Palette) => T
): () => T {
  const cache = new Map<Palette, T>();
  return function useStyles() {
    const palette = useTheme();
    return useMemo(() => {
      let styles = cache.get(palette);
      if (!styles) {
        styles = StyleSheet.create(factory(palette));
        cache.set(palette, styles);
      }
      return styles;
    }, [palette]);
  };
}
