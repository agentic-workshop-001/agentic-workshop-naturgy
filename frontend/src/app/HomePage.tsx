import { Box, Typography, Grid, Card, CardContent, CardActionArea } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import GasMeterIcon from '@mui/icons-material/GasMeter';
import SpeedIcon from '@mui/icons-material/Speed';
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import TransformIcon from '@mui/icons-material/Transform';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PercentIcon from '@mui/icons-material/Percent';

const cards = [
  { label: 'Puntos de Suministro', path: '/supply-points', icon: <GasMeterIcon sx={{ fontSize: 48 }} color="primary" />, desc: 'Gestión de CUPS activos e inactivos' },
  { label: 'Lecturas', path: '/readings', icon: <SpeedIcon sx={{ fontSize: 48 }} color="primary" />, desc: 'Lecturas de contador en m³' },
  { label: 'Tarifario', path: '/tariffs', icon: <PriceChangeIcon sx={{ fontSize: 48 }} color="primary" />, desc: 'Términos fijo y variable por tarifa' },
  { label: 'Factores de Conversión', path: '/conversion-factors', icon: <TransformIcon sx={{ fontSize: 48 }} color="primary" />, desc: 'Coeficiente de conversión por zona/mes' },
  { label: 'IVA / Impuestos', path: '/taxes', icon: <PercentIcon sx={{ fontSize: 48 }} color="primary" />, desc: 'Tasas de IVA con vigencia' },
  { label: 'Facturación', path: '/billing', icon: <ReceiptIcon sx={{ fontSize: 48 }} color="secondary" />, desc: 'Ejecutar facturación y descargar PDFs' },
];

export default function HomePage() {
  const navigate = useNavigate();
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>Panel de Control</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Sistema de facturación de gas natural — Workshop Naturgy
      </Typography>
      <Grid container spacing={3}>
        {cards.map((c) => (
          <Grid key={c.path} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card>
              <CardActionArea onClick={() => navigate(c.path)} sx={{ p: 2 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  {c.icon}
                  <Typography variant="h6" sx={{ mt: 1 }}>{c.label}</Typography>
                  <Typography variant="body2" color="text.secondary">{c.desc}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
