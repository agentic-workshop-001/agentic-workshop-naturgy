import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
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
  Alert,
  TextField,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { supplyPointsApi } from '../api';
import type { SupplyPoint } from '../../../shared/types';
import PageHeader from '../../../shared/ui/PageHeader';
import FeedbackSnackbar from '../../../shared/ui/FeedbackSnackbar';

const emptyForm: SupplyPoint = { cups: '', zona: '', tarifa: '', estado: 'ACTIVO' };

export default function SupplyPointsPage() {
  const [rows, setRows] = useState<SupplyPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupplyPoint | null>(null);
  const [form, setForm] = useState<SupplyPoint>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof SupplyPoint, string>>>({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    supplyPointsApi.getAll()
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormErrors({});
    setOpen(true);
  };

  const openEdit = (sp: SupplyPoint) => {
    setEditing(sp);
    setForm({ ...sp });
    setFormErrors({});
    setOpen(true);
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof SupplyPoint, string>> = {};
    if (!form.cups.trim()) errs.cups = 'CUPS es obligatorio';
    if (!form.zona.trim()) errs.zona = 'Zona es obligatoria';
    if (!form.tarifa.trim()) errs.tarifa = 'Tarifa es obligatoria';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) {
        await supplyPointsApi.update(editing.cups, form);
        setSuccess('Punto de suministro actualizado');
      } else {
        await supplyPointsApi.create(form);
        setSuccess('Punto de suministro creado');
      }
      setOpen(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cups: string) => {
    if (!confirm(`¿Eliminar punto de suministro ${cups}?`)) return;
    try {
      await supplyPointsApi.delete(cups);
      setSuccess('Eliminado correctamente');
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  const columns: GridColDef[] = [
    { field: 'cups', headerName: 'CUPS', flex: 2 },
    { field: 'zona', headerName: 'Zona', flex: 1 },
    { field: 'tarifa', headerName: 'Tarifa', flex: 1 },
    { field: 'estado', headerName: 'Estado', flex: 1 },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton aria-label="editar" size="small" onClick={() => openEdit(params.row as SupplyPoint)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton aria-label="eliminar" size="small" color="error" onClick={() => handleDelete((params.row as SupplyPoint).cups)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Puntos de Suministro">
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Nuevo
        </Button>
      </PageHeader>

      {loading && <LinearProgress sx={{ mb: 1 }} />}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(r) => r.cups}
        autoHeight
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        localeText={{ noRowsLabel: 'Sin puntos de suministro' }}
      />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar Punto de Suministro' : 'Nuevo Punto de Suministro'}</DialogTitle>
        <DialogContent>
          <TextField
            label="CUPS"
            value={form.cups}
            onChange={(e) => setForm({ ...form, cups: e.target.value })}
            error={!!formErrors.cups}
            helperText={formErrors.cups}
            fullWidth
            margin="normal"
            disabled={!!editing}
            required
          />
          <TextField
            label="Zona"
            value={form.zona}
            onChange={(e) => setForm({ ...form, zona: e.target.value })}
            error={!!formErrors.zona}
            helperText={formErrors.zona}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Tarifa"
            value={form.tarifa}
            onChange={(e) => setForm({ ...form, tarifa: e.target.value })}
            error={!!formErrors.tarifa}
            helperText={formErrors.tarifa}
            fullWidth
            margin="normal"
            required
          />
          <FormControl fullWidth margin="normal">
            <InputLabel id="estado-label">Estado</InputLabel>
            <Select
              labelId="estado-label"
              value={form.estado}
              label="Estado"
              onChange={(e) => setForm({ ...form, estado: e.target.value as 'ACTIVO' | 'INACTIVO' })}
            >
              <MenuItem value="ACTIVO">ACTIVO</MenuItem>
              <MenuItem value="INACTIVO">INACTIVO</MenuItem>
            </Select>
            {formErrors.estado && <FormHelperText error>{formErrors.estado}</FormHelperText>}
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <FeedbackSnackbar message={success} onClose={() => setSuccess(null)} />
    </Box>
  );
}

