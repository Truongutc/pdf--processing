import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, CardActionArea,
  Chip, Stack, Select, MenuItem, FormControl, InputLabel,
  Skeleton, IconButton, Tooltip, Alert
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Description as DocIcon,
} from '@mui/icons-material';
import { getDocuments, deleteDocument } from '../api';

const DOC_TYPE_LABELS = {
  quotation: { label: 'Báo giá', color: '#7C4DFF' },
  price_list: { label: 'Bảng giá', color: '#FF9100' },
  contract: { label: 'Hợp đồng', color: '#00BCD4' },
  invoice: { label: 'Hóa đơn', color: '#4CAF50' },
  report: { label: 'Báo cáo', color: '#FF5252' },
  letter: { label: 'Công văn', color: '#FFC107' },
  other: { label: 'Văn bản khác', color: '#9E9E9E' },
};

export default function DocumentsTab({ onViewDocument, refreshKey }) {
  const [documents, setDocuments] = useState([]);
  const [docType, setDocType] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const data = await getDocuments(docType);
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Fetch docs error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [docType, refreshKey]);

  const handleDelete = async (e, docId) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc muốn xóa tài liệu này?')) return;
    try {
      await deleteDocument(docId);
      fetchDocs();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 2 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Lọc theo loại</InputLabel>
            <Select
              value={docType}
              label="Lọc theo loại"
              onChange={(e) => setDocType(e.target.value)}
              sx={{ borderRadius: 3 }}
            >
              <MenuItem value="all">Tất cả</MenuItem>
              <MenuItem value="quotation">Báo giá</MenuItem>
              <MenuItem value="price_list">Bảng giá</MenuItem>
              <MenuItem value="contract">Hợp đồng</MenuItem>
              <MenuItem value="invoice">Hóa đơn</MenuItem>
              <MenuItem value="report">Báo cáo</MenuItem>
              <MenuItem value="letter">Công văn</MenuItem>
              <MenuItem value="other">Khác</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary">
            {documents.length} tài liệu
          </Typography>
        </Stack>
        <Tooltip title="Làm mới">
          <IconButton onClick={fetchDocs} sx={{ color: 'primary.main' }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Loading skeleton */}
      {loading && (
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 4 }} />
          ))}
        </Stack>
      )}

      {/* Documents list */}
      {!loading && (
        <Stack spacing={2}>
          {documents.map((doc) => {
            const typeInfo = DOC_TYPE_LABELS[doc.doc_type] || DOC_TYPE_LABELS.other;
            return (
              <Card key={doc.id}>
                <CardActionArea onClick={() => onViewDocument(doc.id)} sx={{ p: 0 }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ flex: 1 }}>
                        <DocIcon sx={{ color: typeInfo.color, fontSize: 36, mt: 0.5 }} />
                        <Box>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {doc.filename}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                            <Chip
                              label={typeInfo.label}
                              size="small"
                              sx={{
                                bgcolor: typeInfo.color + '22',
                                color: typeInfo.color,
                                fontWeight: 600,
                                fontSize: '0.7rem',
                              }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {doc.page_count} trang
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              • {doc.upload_date}
                            </Typography>
                          </Stack>
                          {doc.summary && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}
                              noWrap style={{ maxWidth: 600 }}>
                              {doc.summary}
                            </Typography>
                          )}
                        </Box>
                      </Stack>

                      <Stack alignItems="flex-end" spacing={0.5} sx={{ ml: 2 }}>
                        {doc.company && (
                          <Typography variant="caption" color="text.secondary">
                            🏢 {doc.company}
                          </Typography>
                        )}
                        {doc.total_amount && (
                          <Typography variant="caption" color="secondary.main" fontWeight={600}>
                            💰 {doc.total_amount}
                          </Typography>
                        )}
                        <Tooltip title="Xóa tài liệu">
                          <IconButton
                            size="small"
                            onClick={(e) => handleDelete(e, doc.id)}
                            sx={{ color: 'error.main', opacity: 0.6, '&:hover': { opacity: 1 } }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Empty state */}
      {!loading && documents.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <DocIcon sx={{ fontSize: 64, color: 'rgba(255,255,255,0.1)', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Chưa có tài liệu nào
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload file PDF để bắt đầu
          </Typography>
        </Box>
      )}
    </Box>
  );
}
