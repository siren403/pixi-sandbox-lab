import type { DesignToken } from "../runtime/surface";

const surfaceTypography = {
  title: { design: 64, minScreenPx: 22 },
  display: { design: 92, minScreenPx: 34 },
  body: { design: 34, minScreenPx: 18 },
  caption: { design: 24, minScreenPx: 14 },
} as const satisfies Record<string, DesignToken>;

const surfaceSpacing = {
  xs: { design: 18, minScreenPx: 12 },
  sm: { design: 24, minScreenPx: 16 },
  md: { design: 36, minScreenPx: 18 },
  lg: { design: 72, minScreenPx: 24 },
} as const satisfies Record<string, DesignToken>;

const surfaceRounded = {
  sm: { design: 8 },
  md: { design: 16 },
  player: { design: 28 },
} as const satisfies Record<string, DesignToken>;

export const surfaceTheme = {
  color: {
    primary: "#17202a",
    background: "#17202a",
    text: "#eef2f6",
    marker: "#4cc9f0",
    player: "#f7c948",
    playerStroke: "#fef3c7",
    action: "#0f766e",
    actionAccent: "#67e8f9",
    warning: "#facc15",
    motion: "#38bdf8",
  },
  typography: surfaceTypography,
  font: {
    title: surfaceTypography.title,
  },
  rounded: surfaceRounded,
  radius: {
    player: surfaceRounded.player,
  },
  spacing: {
    ...surfaceSpacing,
    screen: surfaceSpacing.lg,
    markerInset: { design: 112, minScreenPx: 40 },
  },
  size: {
    markerRadius: { design: 30, minScreenPx: 10 },
    player: { design: 160, minScreenPx: 52 },
    playerStroke: { design: 8, minScreenPx: 3 },
  },
  components: {
    buttonPrimary: {
      height: { design: 86, minScreenPx: 48 },
      padding: surfaceSpacing.sm,
      rounded: surfaceRounded.sm,
      typography: surfaceTypography.body,
    },
    hudRow: {
      height: { design: 80, minScreenPx: 44 },
      padding: surfaceSpacing.lg,
      typography: surfaceTypography.title,
    },
    marker: {
      size: { design: 60, minScreenPx: 20 },
      rounded: { design: 30 },
    },
    player: {
      size: { design: 160, minScreenPx: 52 },
      rounded: surfaceRounded.player,
    },
    playerStroke: {
      size: { design: 8, minScreenPx: 3 },
    },
    actionHighlight: {
      size: { design: 3, minScreenPx: 2 },
      rounded: surfaceRounded.sm,
    },
    inputTarget: {
      size: { design: 96, minScreenPx: 44 },
      rounded: { design: 48 },
    },
    loadingAccent: {
      size: { design: 18, minScreenPx: 8 },
      rounded: surfaceRounded.sm,
    },
  },
} as const;
