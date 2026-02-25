import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Container,
  Divider,
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
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';

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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Brand header */}
      <Box
        sx={{
          px: 2,
          py: 2.5,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <LocalFireDepartmentIcon sx={{ color: 'secondary.main' }} />
        <Box>
          <Typography variant="h6" fontWeight="bold" lineHeight={1.2}>
            Naturgy Gas
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.75 }}>
            Sistema de Facturación
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* Navigation */}
      <List sx={{ pt: 1, flexGrow: 1 }}>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
              onClick={() => setMobileOpen(false)}
              sx={{
                mx: 1,
                my: 0.25,
                borderRadius: 1,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                  '&:hover': { bgcolor: 'primary.dark' },
                },
                '&:not(.Mui-selected):hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          Workshop v1.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Mobile AppBar */}
      <AppBar
        position="fixed"
        sx={{ zIndex: (t) => t.zIndex.drawer + 1, display: { md: 'none' } }}
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
          <LocalFireDepartmentIcon sx={{ mr: 1, color: 'secondary.main' }} />
          <Typography variant="h6" fontWeight="bold">
            Naturgy Gas
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Desktop drawer (permanent) */}
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

      {/* Mobile drawer (temporary) */}
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

      {/* Main content */}
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

