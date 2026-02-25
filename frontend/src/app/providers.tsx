import type { ReactNode } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
