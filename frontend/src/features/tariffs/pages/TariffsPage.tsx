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
import { tariffsApi } from '../api';
import type { GasTariff } from '../../../shared/types';

const emptyForm: GasTariff = { tarifa: '', fijoMesEur: 0, variableEurKwh: 0, vigenciaDesde: '' };

export default function TariffsPage() {
  const [rows, setRows] = useState<GasTariff[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GasTariff | null>(null);
  const [form, setForm] = useState<GasTariff>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof GasTariff, string>>>({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    tariffsApi.getAll()
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

  const openEdit = (t: GasTariff) => {
    setEditing(t);
    setForm({ ...t });
    setFormErrors({});
    setOpen(true);
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof GasTariff, string>> = {};
    if (!form.tarifa.trim()) errs.tarifa = 'Tarifa es obligatoria';
    if (form.fijoMesEur < 0) errs.fijoMesEur = 'Debe ser >= 0';
    if (form.variableEurKwh < 0) errs.variableEurKwh = 'Debe ser >= 0';
    if (!form.vigenciaDesde) errs.vigenciaDesde = 'Fecha de vigencia es obligatoria';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing?.id) {
        await tariffsApi.update(editing.id, form);
        setSuccess('Tarifa actualizada');
      } else {
        await tariffsApi.create(form);
        setSuccess('Tarifa creada');
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
    if (!confirm('¿Eliminar esta tarifa?')) return;
    try {
      await tariffsApi.delete(id);
      setSuccess('Eliminada correctamente');
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  const columns: GridColDef[] = [
    { field: 'tarifa', headerName: 'Tarifa', flex: 1 },
    { field: 'fijoMesEur', headerName: 'Fijo/mes (€)', flex: 1, type: 'number' },
    { field: 'variableEurKwh', headerName: 'Variable (€/kWh)', flex: 1, type: 'number' },
    { field: 'vigenciaDesde', headerName: 'Vigencia desde', flex: 1 },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton aria-label="editar" size="small" onClick={() => openEdit(params.row as GasTariff)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton aria-label="eliminar" size="small" color="error" onClick={() => handleDelete((params.row as GasTariff).id!)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Tarifario</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Nueva Tarifa
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
        localeText={{ noRowsLabel: 'Sin tarifas' }}
      />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar Tarifa' : 'Nueva Tarifa'}</DialogTitle>
        <DialogContent>
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
          <TextField
            label="Fijo/mes (€)"
            type="number"
            value={form.fijoMesEur}
            onChange={(e) => setForm({ ...form, fijoMesEur: parseFloat(e.target.value) || 0 })}
            error={!!formErrors.fijoMesEur}
            helperText={formErrors.fijoMesEur}
            fullWidth
            margin="normal"
            inputProps={{ min: 0, step: 0.01 }}
            required
          />
          <TextField
            label="Variable (€/kWh)"
            type="number"
            value={form.variableEurKwh}
            onChange={(e) => setForm({ ...form, variableEurKwh: parseFloat(e.target.value) || 0 })}
            error={!!formErrors.variableEurKwh}
            helperText={formErrors.variableEurKwh}
            fullWidth
            margin="normal"
            inputProps={{ min: 0, step: 0.00001 }}
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
