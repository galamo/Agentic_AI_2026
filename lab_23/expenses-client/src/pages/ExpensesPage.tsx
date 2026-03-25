import FilterAltOffIcon from '@mui/icons-material/FilterAltOff'
import FilterListIcon from '@mui/icons-material/FilterList'
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { PieChart } from '@mui/x-charts/PieChart'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'

import {
  aggregateAmountByMonth,
  aggregateAmountByType,
  filterReceipts,
  mockReceipts,
} from '../data/mockReceipts'

const money = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })

const chartColors = [
  '#1565c0',
  '#00838f',
  '#6a1b9a',
  '#2e7d32',
  '#ef6c00',
  '#c62828',
  '#5d4037',
  '#455a64',
]

export function ExpensesPage() {
  const [draftDate, setDraftDate] = useState<Dayjs | null>(null)
  const [draftAmount, setDraftAmount] = useState('')
  const [draftDescription, setDraftDescription] = useState('')

  const [appliedDate, setAppliedDate] = useState<Dayjs | null>(null)
  const [appliedAmount, setAppliedAmount] = useState('')
  const [appliedDescription, setAppliedDescription] = useState('')

  const filtered = useMemo(
    () =>
      filterReceipts(mockReceipts, {
        date: appliedDate,
        amountText: appliedAmount,
        descriptionText: appliedDescription,
      }),
    [appliedDate, appliedAmount, appliedDescription],
  )

  const byType = useMemo(() => aggregateAmountByType(filtered), [filtered])
  const byMonth = useMemo(() => aggregateAmountByMonth(filtered), [filtered])

  const typePieData = useMemo(
    () =>
      byType.map((row, i) => ({
        id: i,
        value: row.value,
        label: row.label,
      })),
    [byType],
  )

  const monthPieData = useMemo(
    () =>
      byMonth.map((row, i) => ({
        id: i,
        value: row.value,
        label: row.label,
      })),
    [byMonth],
  )

  function onApplyFilters() {
    setAppliedDate(draftDate)
    setAppliedAmount(draftAmount)
    setAppliedDescription(draftDescription)
  }

  function onClearFilters() {
    setDraftDate(null)
    setDraftAmount('')
    setDraftDescription('')
    setAppliedDate(null)
    setAppliedAmount('')
    setAppliedDescription('')
  }

  const pieLegendSlotProps = {
    legend: {
      direction: 'row' as const,
      position: { vertical: 'bottom' as const, horizontal: 'middle' as const },
    },
  }

  return (
    <Paper elevation={6} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight={700}>
        Expenses
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Mock data for 2026. Use filters and submit to update the charts and table.
      </Typography>

      <Box
        component="section"
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          mb: 3,
        }}
      >
        <DatePicker
          label="Date"
          value={draftDate}
          onChange={(v) => setDraftDate(v)}
          slotProps={{ textField: { size: 'small' } }}
        />
        <TextField
          label="Amount"
          size="small"
          value={draftAmount}
          onChange={(e) => setDraftAmount(e.target.value)}
          placeholder="e.g. 47 or 312"
        />
        <TextField
          label="Description"
          size="small"
          value={draftDescription}
          onChange={(e) => setDraftDescription(e.target.value)}
          placeholder="Free text"
          sx={{ minWidth: 220 }}
        />
        <Button variant="contained" startIcon={<FilterListIcon />} onClick={onApplyFilters}>
          Apply filters
        </Button>
        <Button variant="outlined" startIcon={<FilterAltOffIcon />} onClick={onClearFilters}>
          Clear filters
        </Button>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: 4,
          mb: 4,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Totals by type
          </Typography>
          {typePieData.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 6 }}>
              No data for current filters.
            </Typography>
          ) : (
            <PieChart
              series={[
                {
                  data: typePieData,
                  innerRadius: 32,
                  outerRadius: 92,
                  paddingAngle: 2,
                  cornerRadius: 4,
                  highlightScope: { fade: 'global', highlight: 'item' },
                },
              ]}
              colors={chartColors}
              width={440}
              height={340}
              margin={{ top: 8, right: 8, bottom: 72, left: 8 }}
              slotProps={pieLegendSlotProps}
            />
          )}
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Totals by month
          </Typography>
          {monthPieData.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 6 }}>
              No data for current filters.
            </Typography>
          ) : (
            <PieChart
              series={[
                {
                  data: monthPieData,
                  innerRadius: 32,
                  outerRadius: 92,
                  paddingAngle: 2,
                  cornerRadius: 4,
                  highlightScope: { fade: 'global', highlight: 'item' },
                },
              ]}
              colors={chartColors}
              width={440}
              height={340}
              margin={{ top: 8, right: 8, bottom: 72, left: 8 }}
              slotProps={pieLegendSlotProps}
            />
          )}
        </Box>
      </Box>

      <TableContainer>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    No receipts match the filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{dayjs(r.date).format('MMM D, YYYY')}</TableCell>
                  <TableCell align="right">{money.format(r.amount)}</TableCell>
                  <TableCell>{r.type}</TableCell>
                  <TableCell>{r.description}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}
