import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Box, Chip, Stack, Divider, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, IconButton, Tabs, Tab, Accordion, AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  TableChart as TableIcon,
  Article as TextIcon,
  SmartToy as AiIcon,
} from '@mui/icons-material';
import { getDocument } from '../api';

const DOC_TYPE_LABELS = {
  quotation: { label: 'Báo giá', color: '#7C4DFF' },
  price_list: { label: 'Bảng giá', color: '#FF9100' },
  contract: { label: 'Hợp đồng', color: '#00BCD4' },
  invoice: { label: 'Hóa đơn', color: '#4CAF50' },
  report: { label: 'Báo cáo', color: '#FF5252' },
  letter: { label: 'Công văn', color: '#FFC107' },
  other: { label: 'Văn bản khác', color: '#9E9E9E' },
};

export default function DocumentDetail({ docId, open, onClose }) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (!docId || !open) return;
    setLoading(true);
    setTab(0);
    getDocument(docId)
      .then((data) => setDoc(data.document))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [docId, open]);

  if (!open) return null;

  const typeInfo = doc ? (DOC_TYPE_LABELS[doc.doc_type] || DOC_TYPE_LABELS.other) : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.08)',
          maxHeight: '85vh',
        },
      }}
    >
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress />
        </Box>
      ) : !doc ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="error">Không tìm thấy tài liệu</Typography>
        </Box>
      ) : (
        <>
          <DialogTitle sx={{ pb: 1, pr: 7 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                  {doc.title || doc.filename}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <Chip
                    label={typeInfo.label}
                    size="small"
                    sx={{
                      bgcolor: typeInfo.color + '22',
                      color: typeInfo.color,
                      fontWeight: 600,
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {doc.page_count} trang • {doc.upload_date}
                  </Typography>
                </Stack>
              </Box>
              <IconButton onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
                <CloseIcon />
              </IconButton>
            </Stack>
          </DialogTitle>

          {/* Info bar */}
          <Box sx={{ px: 3, pb: 2 }}>
            <Stack direction="row" spacing={3} flexWrap="wrap">
              {doc.company && (
                <Typography variant="body2">🏢 <strong>Công ty:</strong> {doc.company}</Typography>
              )}
              {doc.total_amount && (
                <Typography variant="body2" color="secondary.main">
                  💰 <strong>Tổng tiền:</strong> {doc.total_amount}
                </Typography>
              )}
              {doc.doc_date && (
                <Typography variant="body2">📅 <strong>Ngày:</strong> {doc.doc_date}</Typography>
              )}
            </Stack>
            {doc.summary && (
              <Box sx={{ mt: 1.5, p: 2, borderRadius: 2, bgcolor: 'rgba(124,77,255,0.06)' }}>
                <Typography variant="body2">{doc.summary}</Typography>
              </Box>
            )}
          </Box>

          {/* Tabs */}
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              px: 3,
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
            }}
          >
            <Tab icon={<AiIcon />} iconPosition="start" label="Phân tích AI" />
            <Tab icon={<TableIcon />} iconPosition="start" label={`Bảng (${doc.tables?.length || 0})`} />
            <Tab icon={<TextIcon />} iconPosition="start" label="Nội dung" />
          </Tabs>
          <Divider />

          <DialogContent sx={{ pt: 2 }}>
            {/* Tab 0: AI Analysis */}
            {tab === 0 && (
              <Box>
                {doc.items?.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      📦 Danh sách hạng mục / sản phẩm
                    </Typography>
                    <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 3 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Tên</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>SL</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>ĐVT</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Đơn giá</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Thành tiền</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {doc.items.map((item, i) => (
                            <TableRow key={i}>
                              <TableCell>{i + 1}</TableCell>
                              <TableCell>{item.name || '-'}</TableCell>
                              <TableCell>{item.quantity || '-'}</TableCell>
                              <TableCell>{item.unit || '-'}</TableCell>
                              <TableCell>{item.unit_price || '-'}</TableCell>
                              <TableCell>{item.amount || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {doc.gemini_data?.key_terms?.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      🏷️ Từ khóa
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {doc.gemini_data.key_terms.map((term, i) => (
                        <Chip key={i} label={term} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </Box>
                )}

                {doc.gemini_data?.recipient && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    📩 <strong>Người nhận:</strong> {doc.gemini_data.recipient}
                  </Typography>
                )}
              </Box>
            )}

            {/* Tab 1: Tables */}
            {tab === 1 && (
              <Box>
                {doc.tables?.length > 0 ? (
                  doc.tables.map((table, idx) => (
                    <Accordion key={idx} defaultExpanded={idx === 0} sx={{ bgcolor: 'rgba(255,255,255,0.02)', mb: 1 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          Bảng {idx + 1} — Trang {table.page_number} ({table.row_count} dòng)
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <TableContainer sx={{ maxHeight: 400 }}>
                          <Table size="small" stickyHeader>
                            {table.headers && (
                              <TableHead>
                                <TableRow>
                                  {table.headers.map((h, hi) => (
                                    <TableCell key={hi} sx={{ fontWeight: 600, bgcolor: 'rgba(124,77,255,0.1)' }}>
                                      {h}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              </TableHead>
                            )}
                            <TableBody>
                              {table.rows?.map((row, ri) => (
                                <TableRow key={ri}>
                                  {row.map((cell, ci) => (
                                    <TableCell key={ci}>{cell}</TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </AccordionDetails>
                    </Accordion>
                  ))
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">Không tìm thấy bảng trong tài liệu</Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Tab 2: Raw Text */}
            {tab === 2 && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.02)',
                  maxHeight: 500,
                  overflow: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {doc.raw_text || 'Không có nội dung text'}
              </Box>
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              href={`/api/documents/${doc.id}/download`}
              sx={{ borderRadius: 3 }}
            >
              Tải PDF gốc
            </Button>
            <Button variant="contained" onClick={onClose} sx={{ borderRadius: 3 }}>
              Đóng
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
