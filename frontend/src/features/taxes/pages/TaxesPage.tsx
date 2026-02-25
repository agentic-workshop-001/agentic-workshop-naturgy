import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { taxesApi } from '../api';
import type { TaxConfig } from '../../../shared/types';

const emptyForm: TaxConfig = { taxCode: 'IVA', taxRate: 0.21, vigenciaDesde: '' };

export default function TaxesPage() {
  const [rows, setRows] = useState<TaxConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaxConfig | null>(null);
  const [form, setForm] = useState<TaxConfig>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof TaxConfig, string>>>({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    taxesApi.getAll()
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

  const openEdit = (t: TaxConfig) => {
    setEditing(t);
    setForm({ ...t });
    setFormErrors({});
    setOpen(true);
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof TaxConfig, string>> = {};
    if (!form.taxCode.trim()) errs.taxCode = 'taxCode es obligatorio';
    if (form.taxRate < 0 || form.taxRate > 1) errs.taxRate = 'Debe estar entre 0 y 1';
    if (!form.vigenciaDesde) errs.vigenciaDesde = 'Fecha de vigencia es obligatoria';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing?.id) {
        await taxesApi.update(editing.id, form);
        setSuccess('IVA actualizado');
      } else {
        await taxesApi.create(form);
        setSuccess('IVA creado');
      }
      setOpen(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta configuración de IVA?')) return;
    try {
      await taxesApi.delete(id);
      setSuccess('Eliminado correctamente');
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  const columns: GridColDef[] = [
    { field: 'taxCode', headerName: 'Código', flex: 1 },
    {
      field: 'taxRate',
      headerName: 'Tasa',
      flex: 1,
      type: 'number',
      valueFormatter: (value) => `${(Number(value) * 100).toFixed(0)}%`,
    },
    { field: 'vigenciaDesde', headerName: 'Vigencia desde', flex: 1 },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton aria-label="editar" size="small" onClick={() => openEdit(params.row as TaxConfig)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton aria-label="eliminar" size="small" color="error" onClick={() => handleDelete((params.row as TaxConfig).id!)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">IVA / Impuestos</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Nuevo IVA
        </Button>
      </Box>
      {loading && <LinearProgress sx={{ mb: 1 }} />}
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id!}
        autoHeight
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        localeText={{ noRowsLabel: 'Sin configuraciones de IVA' }}
      />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar IVA' : 'Nuevo IVA'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Código (ej. IVA)"
            value={form.taxCode}
            onChange={(e) => setForm({ ...form, taxCode: e.target.value })}
            error={!!formErrors.taxCode}
            helperText={formErrors.taxCode}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Tasa (0-1, ej. 0.21)"
            type="number"
            value={form.taxRate}
            onChange={(e) => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })}
            error={!!formErrors.taxRate}
            helperText={formErrors.taxRate || 'Ej: 0.21 para 21%'}
            fullWidth
            margin="normal"
            inputProps={{ min: 0, max: 1, step: 0.01 }}
            required
          />
          <TextField
            label="Vigencia desde"
            type="date"
            value={form.vigenciaDesde}
            onChange={(e) => setForm({ ...form, vigenciaDesde: e.target.value })}
            error={!!formErrors.vigenciaDesde}
            helperText={formErrors.vigenciaDesde}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            required
          />
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
