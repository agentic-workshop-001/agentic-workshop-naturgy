import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Container,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import GasMeterIcon from '@mui/icons-material/GasMeter';
import SpeedIcon from '@mui/icons-material/Speed';
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import TransformIcon from '@mui/icons-material/Transform';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PercentIcon from '@mui/icons-material/Percent';
import MenuIcon from '@mui/icons-material/Menu';

const DRAWER_WIDTH = 240;

const navItems = [
  { label: 'Inicio', path: '/', icon: <HomeIcon /> },
  { label: 'Puntos de Suministro', path: '/supply-points', icon: <GasMeterIcon /> },
  { label: 'Lecturas', path: '/readings', icon: <SpeedIcon /> },
  { label: 'Tarifario', path: '/tariffs', icon: <PriceChangeIcon /> },
  { label: 'Factores de Conversión', path: '/conversion-factors', icon: <TransformIcon /> },
  { label: 'IVA / Impuestos', path: '/taxes', icon: <PercentIcon /> },
  { label: 'Facturación', path: '/billing', icon: <ReceiptIcon /> },
];

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" fontWeight="bold" color="primary">
          🔥 Naturgy Gas
        </Typography>
      </Toolbar>
      <List>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
              onClick={() => setMobileOpen(false)}
              sx={{
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '& .MuiListItemIcon-root': { color: 'white' },
                  '&:hover': { bgcolor: 'primary.dark' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, display: { md: 'none' } }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="abrir menú"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6">Naturgy Gas</Typography>
        </Toolbar>
      </AppBar>

      {/* Desktop drawer */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawer}
        </Drawer>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: { xs: 8, md: 0 },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Container maxWidth="lg">
          {children}
        </Container>
      </Box>
    </Box>
  );
}
