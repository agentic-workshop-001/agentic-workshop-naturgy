import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { billingApi } from '../api';
import type { Invoice, BillingResult } from '../../../shared/types';

export default function BillingPage() {
  const [period, setPeriod] = useState('');
  const [periodError, setPeriodError] = useState('');
  const [running, setRunning] = useState(false);
  const [billingResult, setBillingResult] = useState<BillingResult | null>(null);
  const [showBillingResult, setShowBillingResult] = useState(false);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [filterCups, setFilterCups] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadInvoices = (cups?: string, period?: string) => {
    setLoadingInvoices(true);
    billingApi.getInvoices(cups || undefined, period || undefined)
      .then(setInvoices)
      .catch((e: Error) => setInvoiceError(e.message))
      .finally(() => setLoadingInvoices(false));
  };

  useEffect(() => { loadInvoices(); }, []);

  const validatePeriod = (): boolean => {
    if (!period.trim()) {
      setPeriodError('El período es obligatorio');
      return false;
    }
    if (!/^\d{4}-\d{2}$/.test(period)) {
      setPeriodError('Formato requerido: YYYY-MM');
      return false;
    }
    setPeriodError('');
    return true;
  };

  const handleRunBilling = async () => {
    if (!validatePeriod()) return;
    setRunning(true);
    setBillingResult(null);
    try {
      const result = await billingApi.runBilling(period);
      setBillingResult(result);
      setShowBillingResult(true);
      setSuccess(`Facturación ejecutada: ${result.invoicesCreated} factura(s) creadas`);
      loadInvoices(filterCups || undefined, filterPeriod || undefined);
    } catch (e: unknown) {
      setInvoiceError(e instanceof Error ? e.message : 'Error al ejecutar facturación');
    } finally {
      setRunning(false);
    }
  };

  const handleViewDetail = async (id: number) => {
    setLoadingDetail(true);
    setDetailOpen(true);
    try {
      const inv = await billingApi.getInvoice(id);
      setSelectedInvoice(inv);
    } catch (e: unknown) {
      setInvoiceError(e instanceof Error ? e.message : 'Error al cargar detalle');
      setDetailOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDownloadPdf = (id: number, numeroFactura: string) => {
    const url = billingApi.getPdfUrl(id);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factura-${numeroFactura}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeleteInvoice = async (id: number) => {
    if (!confirm('¿Eliminar esta factura?')) return;
    try {
      await billingApi.deleteInvoice(id);
      setSuccess('Factura eliminada');
      loadInvoices(filterCups || undefined, filterPeriod || undefined);
    } catch (e: unknown) {
      setInvoiceError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  const columns: GridColDef[] = [
    { field: 'numeroFactura', headerName: 'Nº Factura', flex: 2 },
    { field: 'cups', headerName: 'CUPS', flex: 2 },
    { field: 'periodoInicio', headerName: 'Periodo', flex: 1 },
    {
      field: 'base',
      headerName: 'Base (€)',
      flex: 1,
      type: 'number',
      valueFormatter: (value) => Number(value).toFixed(2),
    },
    {
      field: 'impuestos',
      headerName: 'IVA (€)',
      flex: 1,
      type: 'number',
      valueFormatter: (value) => Number(value).toFixed(2),
    },
    {
      field: 'total',
      headerName: 'Total (€)',
      flex: 1,
      type: 'number',
      valueFormatter: (value) => Number(value).toFixed(2),
    },
    { field: 'fechaEmision', headerName: 'Emisión', flex: 1 },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            aria-label="ver detalle"
            size="small"
            onClick={() => handleViewDetail((params.row as Invoice).id)}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            aria-label="descargar PDF"
            size="small"
            color="primary"
            onClick={() => handleDownloadPdf((params.row as Invoice).id, (params.row as Invoice).numeroFactura)}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
          <IconButton
            aria-label="eliminar"
            size="small"
            color="error"
            onClick={() => handleDeleteInvoice((params.row as Invoice).id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Facturación</Typography>

      {/* Run billing */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Ejecutar Facturación</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField
            label="Período (YYYY-MM)"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            error={!!periodError}
            helperText={periodError || 'Ej: 2026-01'}
            size="small"
            sx={{ minWidth: 200 }}
          />
          <Button
            variant="contained"
            color="secondary"
            startIcon={running ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
            onClick={handleRunBilling}
            disabled={running}
            sx={{ mt: 0.5 }}
          >
            {running ? 'Ejecutando…' : 'Ejecutar facturación'}
          </Button>
        </Box>

        {billingResult && (
          <Box sx={{ mt: 2 }}>
            <Box
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setShowBillingResult(!showBillingResult)}
            >
              <Typography variant="subtitle1" sx={{ mr: 1 }}>
                Resultado: {billingResult.invoicesCreated} factura(s) creada(s)
                {billingResult.errors.length > 0 && (
                  <Chip label={`${billingResult.errors.length} error(es)`} color="warning" size="small" sx={{ ml: 1 }} />
                )}
              </Typography>
              {showBillingResult ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </Box>
            <Collapse in={showBillingResult}>
              {billingResult.errors.length > 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  <Typography variant="subtitle2">Errores de facturación:</Typography>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {billingResult.errors.map((err, i) => (
                      <li key={i}><Typography variant="body2">{err}</Typography></li>
                    ))}
                  </ul>
                </Alert>
              )}
            </Collapse>
          </Box>
        )}
      </Paper>

      {/* Invoice list */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Facturas</Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Filtrar por CUPS"
            size="small"
            value={filterCups}
            onChange={(e) => setFilterCups(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          <TextField
            label="Filtrar por período (YYYY-MM)"
            size="small"
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => loadInvoices(filterCups || undefined, filterPeriod || undefined)}
          >
            Aplicar filtros
          </Button>
        </Box>

        {loadingInvoices && <LinearProgress sx={{ mb: 1 }} />}
        {invoiceError && (
          <Alert severity="error" onClose={() => setInvoiceError(null)} sx={{ mb: 2 }}>
            {invoiceError}
          </Alert>
        )}
        <DataGrid
          rows={invoices}
          columns={columns}
          getRowId={(r) => r.id}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          localeText={{ noRowsLabel: 'Sin facturas' }}
        />
      </Paper>

      {/* Invoice detail dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Detalle de Factura
          {selectedInvoice && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              sx={{ ml: 2 }}
              onClick={() => handleDownloadPdf(selectedInvoice.id, selectedInvoice.numeroFactura)}
            >
              Descargar PDF
            </Button>
          )}
        </DialogTitle>
        <DialogContent>
          {loadingDetail && <LinearProgress />}
          {selectedInvoice && !loadingDetail && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Nº Factura</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedInvoice.numeroFactura}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">CUPS</Typography>
                  <Typography variant="body1">{selectedInvoice.cups}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Período</Typography>
                  <Typography variant="body1">{selectedInvoice.periodoInicio} — {selectedInvoice.periodoFin}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Fecha Emisión</Typography>
                  <Typography variant="body1">{selectedInvoice.fechaEmision}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {selectedInvoice.lines && selectedInvoice.lines.length > 0 && (
                <>
                  <Typography variant="h6" sx={{ mb: 1 }}>Líneas</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Descripción</TableCell>
                        <TableCell align="right">Cantidad</TableCell>
                        <TableCell align="right">Precio unit.</TableCell>
                        <TableCell align="right">Importe (€)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedInvoice.lines.map((line, i) => (
                        <TableRow key={i}>
                          <TableCell>{line.descripcion}</TableCell>
                          <TableCell align="right">{Number(line.cantidad).toFixed(3)}</TableCell>
                          <TableCell align="right">{Number(line.precioUnitario).toFixed(5)}</TableCell>
                          <TableCell align="right">{Number(line.importe).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Divider sx={{ my: 2 }} />
                </>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                <Typography>Base imponible: <strong>{Number(selectedInvoice.base).toFixed(2)} €</strong></Typography>
                <Typography>IVA: <strong>{Number(selectedInvoice.impuestos).toFixed(2)} €</strong></Typography>
                <Typography variant="h6">Total: <strong>{Number(selectedInvoice.total).toFixed(2)} €</strong></Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess(null)}>
        <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>
      </Snackbar>
    </Box>
  );
}
