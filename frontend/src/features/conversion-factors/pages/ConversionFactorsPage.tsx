import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  TextField,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import { conversionFactorsApi } from '../api';
import type { ConversionFactor } from '../../../shared/types';
import PageHeader from '../../../shared/ui/PageHeader';
import FeedbackSnackbar from '../../../shared/ui/FeedbackSnackbar';

const emptyForm: ConversionFactor = { zona: '', mes: '', coefConv: 0, pcsKwhM3: 0 };

export default function ConversionFactorsPage() {
  const [rows, setRows] = useState<ConversionFactor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ConversionFactor | null>(null);
  const [form, setForm] = useState<ConversionFactor>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ConversionFactor, string>>>({});
  const [saving, setSaving] = useState(false);
  const [filterZona, setFilterZona] = useState('');
  const [filterMes, setFilterMes] = useState('');

  const load = () => {
    setLoading(true);
    conversionFactorsApi.getAll()
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

  const openEdit = (cf: ConversionFactor) => {
    setEditing(cf);
    setForm({ ...cf });
    setFormErrors({});
    setOpen(true);
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof ConversionFactor, string>> = {};
    if (!form.zona.trim()) errs.zona = 'Zona es obligatoria';
    if (!form.mes.trim()) errs.mes = 'Mes es obligatorio';
    else if (!/^\d{4}-\d{2}$/.test(form.mes)) errs.mes = 'Formato YYYY-MM';
    if (form.coefConv <= 0) errs.coefConv = 'Debe ser > 0';
    if (form.pcsKwhM3 <= 0) errs.pcsKwhM3 = 'Debe ser > 0';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing?.id) {
        await conversionFactorsApi.update(editing.id, form);
        setSuccess('Factor actualizado');
      } else {
        await conversionFactorsApi.create(form);
        setSuccess('Factor creado');
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
    if (!confirm('¿Eliminar este factor de conversión?')) return;
    try {
      await conversionFactorsApi.delete(id);
      setSuccess('Eliminado correctamente');
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  const filteredRows = rows.filter((r) => {
    if (filterZona && !r.zona.toLowerCase().includes(filterZona.toLowerCase())) return false;
    if (filterMes && r.mes !== filterMes) return false;
    return true;
  });

  const columns: GridColDef[] = [
    { field: 'zona', headerName: 'Zona', flex: 1 },
    { field: 'mes', headerName: 'Mes', flex: 1 },
    { field: 'coefConv', headerName: 'Coef. Conv.', flex: 1, type: 'number' },
    { field: 'pcsKwhM3', headerName: 'PCS (kWh/m³)', flex: 1, type: 'number' },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton aria-label="editar" size="small" onClick={() => openEdit(params.row as ConversionFactor)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton aria-label="eliminar" size="small" color="error" onClick={() => handleDelete((params.row as ConversionFactor).id!)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Factores de Conversión">
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Nuevo Factor
        </Button>
      </PageHeader>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Filtrar por zona"
          size="small"
          value={filterZona}
          onChange={(e) => setFilterZona(e.target.value)}
          sx={{ minWidth: 160 }}
        />
        <TextField
          label="Filtrar por mes (YYYY-MM)"
          size="small"
          value={filterMes}
          onChange={(e) => setFilterMes(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <Button variant="outlined" startIcon={<FilterListIcon />} onClick={() => {}}>
          Filtrar
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 1 }} />}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DataGrid
        rows={filteredRows}
        columns={columns}
        getRowId={(r) => r.id!}
        autoHeight
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        localeText={{ noRowsLabel: 'Sin factores de conversión' }}
      />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar Factor de Conversión' : 'Nuevo Factor de Conversión'}</DialogTitle>
        <DialogContent>
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
            label="Mes (YYYY-MM)"
            value={form.mes}
            onChange={(e) => setForm({ ...form, mes: e.target.value })}
            error={!!formErrors.mes}
            helperText={formErrors.mes || 'Formato: YYYY-MM'}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Coef. Conversión"
            type="number"
            value={form.coefConv}
            onChange={(e) => setForm({ ...form, coefConv: parseFloat(e.target.value) || 0 })}
            error={!!formErrors.coefConv}
            helperText={formErrors.coefConv}
            fullWidth
            margin="normal"
            slotProps={{ htmlInput: { min: 0.001, step: 0.0001 } }}
            required
          />
          <TextField
            label="PCS (kWh/m³)"
            type="number"
            value={form.pcsKwhM3}
            onChange={(e) => setForm({ ...form, pcsKwhM3: parseFloat(e.target.value) || 0 })}
            error={!!formErrors.pcsKwhM3}
            helperText={formErrors.pcsKwhM3}
            fullWidth
            margin="normal"
            slotProps={{ htmlInput: { min: 0.001, step: 0.0001 } }}
            required
          />
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

