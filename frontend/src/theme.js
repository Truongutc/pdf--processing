import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7C4DFF',
      light: '#B47CFF',
      dark: '#5A1FCC',
    },
    secondary: {
      main: '#FF9100',
      light: '#FFB74D',
      dark: '#E65100',
    },
    background: {
      default: '#0A0E1A',
      paper: '#111827',
    },
    text: {
      primary: '#E8EAED',
      secondary: '#9AA0A6',
    },
    success: {
      main: '#00E676',
    },
    error: {
      main: '#FF5252',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
    },
    body1: {
      lineHeight: 1.7,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(20px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: 'rgba(124, 77, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(124, 77, 255, 0.15)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 12,
          padding: '10px 24px',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #7C4DFF 0%, #536DFE 100%)',
          boxShadow: '0 4px 15px rgba(124, 77, 255, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #9C6FFF 0%, #738FFE 100%)',
            boxShadow: '0 6px 20px rgba(124, 77, 255, 0.4)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#7C4DFF',
              borderWidth: 2,
            },
          },
        },
      },
    },
  },
});

export default theme;
