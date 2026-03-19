import { useState, useCallback } from 'react';
import {
  Box, Typography, LinearProgress, Alert, Card, CardContent,
  Chip, Stack, Fade, Paper
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon,
  Description as DocIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { uploadPdf } from '../api';

const DOC_TYPE_LABELS = {
  quotation: { label: 'Báo giá', color: '#7C4DFF' },
  price_list: { label: 'Bảng giá', color: '#FF9100' },
  contract: { label: 'Hợp đồng', color: '#00BCD4' },
  invoice: { label: 'Hóa đơn', color: '#4CAF50' },
  report: { label: 'Báo cáo', color: '#FF5252' },
  letter: { label: 'Công văn', color: '#FFC107' },
  other: { label: 'Văn bản khác', color: '#9E9E9E' },
};

export default function UploadTab({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setProgress(0);
    setResult(null);
    setError(null);

    try {
      const data = await uploadPdf(file, setProgress);
      setResult(data);
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Lỗi không xác định';
      setError(msg);
    } finally {
      setUploading(false);
    }
  }, [onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: uploading,
  });

  const classification = result?.classification;
  const typeInfo = classification ? DOC_TYPE_LABELS[classification.doc_type] || DOC_TYPE_LABELS.other : null;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 2 }}>
      {/* Dropzone */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 6,
          textAlign: 'center',
          cursor: uploading ? 'wait' : 'pointer',
          borderRadius: 4,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'rgba(255,255,255,0.15)',
          bgcolor: isDragActive ? 'rgba(124, 77, 255, 0.08)' : 'rgba(255,255,255,0.02)',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'primary.light',
            bgcolor: 'rgba(124, 77, 255, 0.05)',
            transform: 'scale(1.01)',
          },
        }}
      >
        <input {...getInputProps()} />
        <UploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2, opacity: 0.8 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Thả file PDF tại đây...' : 'Kéo thả file PDF hoặc click để chọn'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Hỗ trợ: Báo giá, Bảng giá, Hợp đồng, Hóa đơn, và nhiều loại văn bản khác
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Tối đa 50MB • Sử dụng Gemini AI để phân loại tự động
        </Typography>
      </Paper>

      {/* Progress */}
      {uploading && (
        <Fade in>
          <Box sx={{ mt: 3 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Đang xử lý...
              </Typography>
              <Typography variant="body2" color="primary.main" fontWeight={600}>
                {progress}%
              </Typography>
            </Stack>
            <LinearProgress
              variant={progress < 100 ? 'determinate' : 'indeterminate'}
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'rgba(124, 77, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: 'linear-gradient(90deg, #7C4DFF, #536DFE)',
                },
              }}
            />
            {progress >= 100 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                ⚡ Đang phân tích bằng Gemini AI...
              </Typography>
            )}
          </Box>
        </Fade>
      )}

      {/* Error */}
      {error && (
        <Fade in>
          <Alert severity="error" sx={{ mt: 3, borderRadius: 3 }}>
            {error}
          </Alert>
        </Fade>
      )}

      {/* Result */}
      {result && (
        <Fade in>
          <Card sx={{ mt: 3, background: 'linear-gradient(135deg, rgba(124,77,255,0.08) 0%, rgba(83,109,254,0.05) 100%)' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <CheckIcon sx={{ color: 'success.main' }} />
                <Typography variant="h6" color="success.main">
                  Xử lý thành công!
                </Typography>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <DocIcon sx={{ color: 'primary.main', fontSize: 40 }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {result.filename}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={typeInfo?.label || 'Khác'}
                      size="small"
                      sx={{
                        bgcolor: typeInfo?.color + '22',
                        color: typeInfo?.color,
                        fontWeight: 600,
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {result.page_count} trang • {result.tables_found} bảng
                    </Typography>
                    {classification?.confidence && (
                      <Chip
                        label={`${Math.round(classification.confidence * 100)}% tin cậy`}
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: 'success.main', color: 'success.main' }}
                      />
                    )}
                  </Stack>
                </Box>
              </Stack>

              {classification?.summary && (
                <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)' }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
                    📋 Tóm tắt AI
                  </Typography>
                  <Typography variant="body2">{classification.summary}</Typography>
                </Box>
              )}

              {classification?.company && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  🏢 <strong>Công ty:</strong> {classification.company}
                </Typography>
              )}
              {classification?.total_amount && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  💰 <strong>Tổng tiền:</strong> {classification.total_amount}
                </Typography>
              )}
              {classification?.doc_date && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  📅 <strong>Ngày:</strong> {classification.doc_date}
                </Typography>
              )}

              {classification?.items?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight={500} color="text.secondary" gutterBottom>
                    📦 Hạng mục ({classification.items.length})
                  </Typography>
                  {classification.items.slice(0, 5).map((item, i) => (
                    <Typography key={i} variant="caption" display="block" sx={{ ml: 2, mb: 0.3 }}>
                      • {item.name} {item.quantity && `— SL: ${item.quantity}`} {item.amount && `— ${item.amount}`}
                    </Typography>
                  ))}
                  {classification.items.length > 5 && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                      ... và {classification.items.length - 5} hạng mục khác
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Fade>
      )}
    </Box>
  );
}
