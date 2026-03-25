import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Typography,
} from '@mui/material'
import { useRef, useState } from 'react'

export function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    setFileName(f ? f.name : null)
  }

  function onAnalyze() {
    const hasFile = Boolean(inputRef.current?.files?.[0])
    if (!hasFile) return
    setSuccessOpen(true)
  }

  function onCloseSuccess() {
    setSuccessOpen(false)
    if (inputRef.current) inputRef.current.value = ''
    setFileName(null)
  }

  return (
    <Paper
      elevation={6}
      sx={{
        p: { xs: 3, sm: 5 },
        maxWidth: 560,
        mx: 'auto',
        borderRadius: 3,
      }}
    >
      <Typography variant="h4" gutterBottom fontWeight={700}>
        Analyze receipt
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Choose an image of a receipt. This demo simulates analysis and saving to the database — no
        backend is called.
      </Typography>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onFileChange}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
        <Button variant="outlined" size="large" onClick={() => inputRef.current?.click()}>
          Choose image
        </Button>

        {fileName && (
          <Typography variant="body2" color="text.secondary">
            Selected: <strong>{fileName}</strong>
          </Typography>
        )}

        <Button
          variant="contained"
          size="large"
          startIcon={<CloudUploadIcon />}
          disabled={!fileName}
          onClick={onAnalyze}
        >
          Analyze &amp; save to database
        </Button>
      </Box>

      <Dialog open={successOpen} onClose={onCloseSuccess} maxWidth="xs" fullWidth>
        <DialogTitle>Success</DialogTitle>
        <DialogContent>
          <Typography>
            Receipt analyzed and saved successfully (mock). In a full stack setup, the image would be
            processed by the backend and persisted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseSuccess} variant="contained" autoFocus>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
