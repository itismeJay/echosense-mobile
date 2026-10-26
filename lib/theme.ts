// Design tokens matching the web dashboard (echosense-frontend app/globals.css).
// Green is for primary actions and the active tab only, never for severity.

export interface Palette {
  background: string;
  surface: string;
  surfaceMuted: string;
  line: string;
  /** Input and control borders; meets 3:1 against the surface. */
  lineStrong: string;
  text: string;
  textMuted: string;
  brand: string;
  brandPressed: string;
  /** Text and icons on a green background. */
  onBrand: string;
  /** Green text and links. */
  link: string;
  focus: string;
  danger: string;
  dangerBackground: string;
  high: string;
  highBackground: string;
  medium: string;
  mediumBackground: string;
  low: string;
  lowBackground: string;
}

export const LIGHT: Palette = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F8F7',
  line: '#E4E7E4',
  lineStrong: '#8A928A',
  text: '#161A16',
  textMuted: '#5E665E',
  brand: '#3ECF8E',
  brandPressed: '#35B97E',
  onBrand: '#0B2A1C',
  link: '#1A7F52',
  focus: '#1A7F52',
  danger: '#B42318',
  dangerBackground: '#FEF3F2',
  high: '#B42318',
  highBackground: '#FEF3F2',
  medium: '#8F4A00',
  mediumBackground: '#FFF6E5',
  low: '#1D5FBF',
  lowBackground: '#EEF4FF',
};

export const DARK: Palette = {
  background: '#000000',
  surface: '#141414',
  surfaceMuted: '#0A0A0A',
  line: '#262626',
  // The web's #5C5C5C is 2.9:1 on #141414; #666666 meets 3:1 on both surfaces.
  lineStrong: '#666666',
  text: '#FFFFFF',
  textMuted: '#A3A3A3',
  brand: '#3ECF8E',
  brandPressed: '#5CDBA2',
  onBrand: '#0B2A1C',
  // As on the web, links are white in dark mode; green stays on actions.
  link: '#FFFFFF',
  focus: '#3ECF8E',
  danger: '#FF8B80',
  dangerBackground: '#2A1210',
  high: '#FF8B80',
  highBackground: '#2A1210',
  medium: '#F5B547',
  mediumBackground: '#2A1F0A',
  low: '#7DB4FF',
  lowBackground: '#0F1C30',
};

export type ColorScheme = 'light' | 'dark';

export function paletteFor(scheme: ColorScheme | null | undefined): Palette {
  return scheme === 'dark' ? DARK : LIGHT;
}

export const FONTS = {
  regular: 'IBMPlexSans_400Regular',
  medium: 'IBMPlexSans_500Medium',
  semibold: 'IBMPlexSans_600SemiBold',
  bold: 'IBMPlexSans_700Bold',
} as const;

export const TYPE = {
  display: { fontSize: 28, lineHeight: 34 },
  title: { fontSize: 20, lineHeight: 28 },
  bodyLarge: { fontSize: 16, lineHeight: 24 },
  body: { fontSize: 15, lineHeight: 22 },
  small: { fontSize: 13, lineHeight: 18 },
} as const;

export const RADIUS = {
  panel: 12,
  control: 8,
  tag: 4,
} as const;

export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export type SeverityKey = 'high' | 'medium' | 'low' | 'unknown';

export function severityColors(
  palette: Palette,
  severity: SeverityKey
): { color: string; background: string } {
  switch (severity) {
    case 'high':
      return { color: palette.high, background: palette.highBackground };
    case 'medium':
      return { color: palette.medium, background: palette.mediumBackground };
    case 'low':
      return { color: palette.low, background: palette.lowBackground };
    default:
      return { color: palette.textMuted, background: palette.surfaceMuted };
  }
}

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((start) =>
    channel(parseInt(value.slice(start, start + 2), 16))
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio between two #RRGGBB colors. */
export function contrastRatio(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a
  );
  return (light + 0.05) / (dark + 0.05);
}
