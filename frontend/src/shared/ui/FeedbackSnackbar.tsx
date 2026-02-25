/**
 * FeedbackSnackbar — Naturgy React Standards
 * SSOT: _data/specs/react-standards.md
 *
 * Standard success feedback: Snackbar + Alert severity="success"
 *
 * Usage:
 *   <FeedbackSnackbar message={success} onClose={() => setSuccess(null)} />
 */
import { Snackbar, Alert } from '@mui/material';

interface FeedbackSnackbarProps {
  message: string | null;
  onClose: () => void;
  autoHideDuration?: number;
}

export default function FeedbackSnackbar({
  message,
  onClose,
  autoHideDuration = 3000,
}: FeedbackSnackbarProps) {
  return (
    <Snackbar open={!!message} autoHideDuration={autoHideDuration} onClose={onClose}>
      <Alert severity="success" onClose={onClose} variant="filled">
        {message}
      </Alert>
    </Snackbar>
  );
}
