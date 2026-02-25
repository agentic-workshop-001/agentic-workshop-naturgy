/**
 * Naturgy React Standards — MUI v5 Theme
 * SSOT: _data/specs/react-standards.md
 *
 * Rules:
 *  - Use semantic tokens, not raw hex values in components.
 *  - Components should use `sx` with theme values.
 *  - Centralize colors, spacing and typography here.
 */
import { createTheme } from '@mui/material/styles';

// ── Naturgy brand tokens ──────────────────────────────────────────────────────
const NATURGY_NAVY   = '#1a2744'; // primary: headers, sidebar selected state
const NATURGY_GREEN  = '#2e7d32'; // secondary: CTA buttons, success indicators
const BACKGROUND_DEFAULT = '#f4f5f7'; // light neutral page background
const BACKGROUND_PAPER   = '#ffffff';

const theme = createTheme({
  // ── Palette ────────────────────────────────────────────────────────────────
  palette: {
    primary: {
      main: NATURGY_NAVY,
      contrastText: '#ffffff',
    },
    secondary: {
      main: NATURGY_GREEN,
      contrastText: '#ffffff',
    },
    background: {
      default: BACKGROUND_DEFAULT,
      paper: BACKGROUND_PAPER,
    },
    text: {
      primary: '#1c2b3a',
      secondary: '#5c6b7a',
    },
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#ed6c02',
    },
    success: {
      main: NATURGY_GREEN,
    },
  },

  // ── Shape ──────────────────────────────────────────────────────────────────
  shape: {
    borderRadius: 8,
  },

  // ── Typography ─────────────────────────────────────────────────────────────
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      fontSize: '1.75rem',
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },

  // ── Component overrides ────────────────────────────────────────────────────
  components: {
    // Buttons: consistent elevation and text transform
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    // Cards: consistent shadow and radius
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
        },
      },
    },
    // Paper: light shadow by default
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
        },
      },
    },
    // DataGrid: cannot augment theme without explicit augmentation import — configured per-usage via sx instead
    // LinearProgress: use primary color
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 4,
        },
      },
    },
    // Dialog: consistent border radius
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },
    // Drawer: no elevation, just border
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(0,0,0,0.08)',
          backgroundColor: BACKGROUND_PAPER,
        },
      },
    },
  },
});

export default theme;

