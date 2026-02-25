/**
 * PageHeader — Naturgy React Standards
 * SSOT: _data/specs/react-standards.md
 *
 * Standard page header pattern:
 *   - Title: Typography variant="h4"
 *   - Primary action button aligned right (optional)
 *
 * Usage:
 *   <PageHeader title="Puntos de Suministro">
 *     <Button variant="contained" startIcon={<AddIcon />} onClick={...}>
 *       Nuevo
 *     </Button>
 *   </PageHeader>
 */
import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

interface PageHeaderProps {
  title: string;
  /** Optional primary action (e.g. a "New" button) rendered on the right */
  children?: ReactNode;
}

export default function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
      }}
    >
      <Typography variant="h4">{title}</Typography>
      {children && <Box>{children}</Box>}
    </Box>
  );
}
