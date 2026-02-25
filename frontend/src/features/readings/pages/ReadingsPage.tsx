import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import { readingsApi } from '../api';
import { validateGasReading, formatErrorMessage } from '../validators';
import type { GasReading } from '../../../shared/types';

const emptyForm: GasReading = { cups: '', fecha: '', lecturaM3: 0, tipo: 'REAL' };

export default function ReadingsPage() {
  const [rows, setRows] = useState<GasReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<GasReading>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof GasReading, string>>>({});
  const [saving, setSaving] = useState(false);
  // filters
  const [filterCups, setFilterCups] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const load = (cups?: string) => {
    setLoading(true);
    readingsApi.getAll(cups || undefined)
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const applyFilters = () => {
    load(filterCups || undefined);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setFormErrors({});
    setOpen(true);
  };

  const validate = (): boolean => {
    const errs = validateGasReading(form);
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // Prepare payload: ensure fecha is in ISO format YYYY-MM-DD
      const payload: GasReading = {
        cups: form.cups.trim(),
        fecha: form.fecha, // Should already be YYYY-MM-DD from date input
        lecturaM3: form.lecturaM3,
        tipo: form.tipo,
      };
      await readingsApi.create(payload);
      setSuccess('Lectura creada correctamente');
      setOpen(false);
      setFormErrors({});
      load(filterCups || undefined);
    } catch (e: unknown) {
      const errorMsg = formatErrorMessage(e);
      setError(errorMsg);
      // Also show in form errors if it's a validation error from backend
      if (
        errorMsg.toLowerCase().includes('cups') ||
        errorMsg.toLowerCase().includes('fecha') ||
        errorMsg.toLowerCase().includes('lectura')
      ) {
        setFormErrors(prev => ({ ...prev, cups: errorMsg }));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cups: string, fecha: string) => {
    if (!confirm(`¿Eliminar lectura ${cups} / ${fecha}?`)) return;
    try {
      await readingsApi.delete(cups, fecha);
      setSuccess('Eliminada correctamente');
      load(filterCups || undefined);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  const filteredRows = rows.filter((r) => {
    if (filterDateFrom && r.fecha < filterDateFrom) return false;
    if (filterDateTo && r.fecha > filterDateTo) return false;
    return true;
  });

  const columns: GridColDef[] = [
    { field: 'cups', headerName: 'CUPS', flex: 2 },
    { field: 'fecha', headerName: 'Fecha', flex: 1 },
    { field: 'lecturaM3', headerName: 'Lectura m³', flex: 1, type: 'number' },
    { field: 'tipo', headerName: 'Tipo', flex: 1 },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          aria-label="eliminar"
          size="small"
          color="error"
          onClick={() => handleDelete((params.row as GasReading).cups, (params.row as GasReading).fecha)}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Lecturas de Gas</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Nueva Lectura
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Filtrar por CUPS"
          size="small"
          value={filterCups}
          onChange={(e) => setFilterCups(e.target.value)}
          sx={{ minWidth: 220 }}
        />
        <TextField
          label="Fecha desde"
          size="small"
          type="date"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
        <TextField
          label="Fecha hasta"
          size="small"
          type="date"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
        <Button variant="outlined" startIcon={<FilterListIcon />} onClick={applyFilters}>
          Aplicar
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 1 }} />}
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      <DataGrid
        rows={filteredRows}
        columns={columns}
        getRowId={(r) => `${r.cups}|${r.fecha}`}
        autoHeight
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        localeText={{ noRowsLabel: 'Sin lecturas' }}
      />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva Lectura</DialogTitle>
        <DialogContent>
          <TextField
            label="CUPS"
            value={form.cups}
            onChange={(e) => setForm({ ...form, cups: e.target.value })}
            error={!!formErrors.cups}
            helperText={formErrors.cups}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Fecha (YYYY-MM-DD)"
            type="date"
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            error={!!formErrors.fecha}
            helperText={formErrors.fecha}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            required
          />
          <TextField
            label="Lectura m³"
            type="number"
            value={form.lecturaM3}
            onChange={(e) => setForm({ ...form, lecturaM3: parseFloat(e.target.value) || 0 })}
            error={!!formErrors.lecturaM3}
            helperText={formErrors.lecturaM3}
            fullWidth
            margin="normal"
            inputProps={{ min: 0, step: 0.001 }}
            required
          />
          <FormControl fullWidth margin="normal">
            <InputLabel id="tipo-label">Tipo</InputLabel>
            <Select
              labelId="tipo-label"
              value={form.tipo}
              label="Tipo"
              onChange={(e) => setForm({ ...form, tipo: e.target.value as 'REAL' | 'ESTIMADA' })}
            >
              <MenuItem value="REAL">REAL</MenuItem>
              <MenuItem value="ESTIMADA">ESTIMADA</MenuItem>
            </Select>
            {formErrors.tipo && <FormHelperText error>{formErrors.tipo}</FormHelperText>}
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!success} autoHideDuration={3000} onClose={() => setSuccess(null)}>
        <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>
      </Snackbar>
    </Box>
  );
}
