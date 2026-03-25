import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import {
  AppBar,
  Box,
  Button,
  Container,
  Toolbar,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const navButtonSx = {
  color: 'common.white',
  fontWeight: 600,
  '&.active': {
    bgcolor: alpha('#fff', 0.18),
  },
} as const

export function AppLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: 'url(/bg-expenses.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: alpha('#0d47a1', 0.88),
          backdropFilter: 'blur(10px)',
          borderBottom: (t) => `1px solid ${alpha(t.palette.common.white, 0.12)}`,
        }}
      >
        <Toolbar sx={{ gap: 2, py: 1 }}>
          <Box
            component="img"
            src="/expenses-icon.svg"
            alt=""
            sx={{ width: 40, height: 40, borderRadius: 1, boxShadow: 2 }}
          />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Expenses
          </Typography>
          <Button
            className={pathname === '/' ? 'active' : undefined}
            sx={navButtonSx}
            onClick={() => navigate('/')}
            startIcon={<ReceiptLongIcon />}
          >
            Upload receipt
          </Button>
          <Button
            className={pathname === '/expenses' ? 'active' : undefined}
            sx={navButtonSx}
            onClick={() => navigate('/expenses')}
          >
            Expenses table
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ flex: 1, py: 4 }}>
        <Outlet />
      </Container>
    </Box>
  )
}
