import { useState, useEffect, useCallback } from 'react';
import {
  Box, TextField, Typography, Card, CardContent, CardActionArea,
  Chip, Stack, InputAdornment, Select, MenuItem, FormControl,
  InputLabel, Fade, CircularProgress
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { searchDocuments } from '../api';

const DOC_TYPE_LABELS = {
  quotation: { label: 'Báo giá', color: '#7C4DFF' },
  price_list: { label: 'Bảng giá', color: '#FF9100' },
  contract: { label: 'Hợp đồng', color: '#00BCD4' },
  invoice: { label: 'Hóa đơn', color: '#4CAF50' },
  report: { label: 'Báo cáo', color: '#FF5252' },
  letter: { label: 'Công văn', color: '#FFC107' },
  other: { label: 'Văn bản khác', color: '#9E9E9E' },
};

export default function SearchTab({ onViewDocument }) {
  const [query, setQuery] = useState('');
  const [docType, setDocType] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    try {
      const data = await searchDocuments(query, docType);
      setResults(data.results || []);
      setSearched(true);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, docType]);

  // Debounce search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(doSearch, 500);
    return () => clearTimeout(timer);
  }, [query, docType, doSearch]);

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 2 }}>
      {/* Search bar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          fullWidth
          placeholder="Tìm kiếm tài liệu PDF... (ví dụ: báo giá xi măng, hợp đồng thuê)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'primary.main' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(255,255,255,0.03)',
            }
          }}
        />
        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel>Loại tài liệu</InputLabel>
          <Select
            value={docType}
            label="Loại tài liệu"
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
      </Stack>

      {/* Loading */}
      {loading && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <CircularProgress size={32} sx={{ color: 'primary.main' }} />
        </Box>
      )}

      {/* Results */}
      {!loading && searched && (
        <Fade in>
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Tìm thấy <strong>{results.length}</strong> kết quả cho "{query}"
            </Typography>

            <Stack spacing={2}>
              {results.map((doc) => {
                const typeInfo = DOC_TYPE_LABELS[doc.doc_type] || DOC_TYPE_LABELS.other;
                return (
                  <Card key={doc.id}>
                    <CardActionArea onClick={() => onViewDocument(doc.id)} sx={{ p: 0 }}>
                      <CardContent sx={{ p: 2.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box sx={{ flex: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {doc.filename}
                              </Typography>
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
                            </Stack>

                            {doc.title && (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                {doc.title}
                              </Typography>
                            )}

                            {doc.snippet_text && (
                              <Typography
                                variant="body2"
                                sx={{
                                  color: 'text.secondary',
                                  mt: 1,
                                  '& mark': {
                                    bgcolor: 'rgba(124, 77, 255, 0.3)',
                                    color: 'primary.light',
                                    px: 0.3,
                                    borderRadius: 0.5,
                                  },
                                }}
                                dangerouslySetInnerHTML={{ __html: doc.snippet_text }}
                              />
                            )}
                          </Box>

                          <Stack alignItems="flex-end" spacing={0.5} sx={{ ml: 2, flexShrink: 0 }}>
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
                            <Typography variant="caption" color="text.secondary">
                              {doc.upload_date?.split(' ')[0]}
                            </Typography>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                );
              })}
            </Stack>

            {results.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="h6" color="text.secondary">
                  Không tìm thấy kết quả
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Thử từ khóa khác hoặc bỏ bộ lọc loại tài liệu
                </Typography>
              </Box>
            )}
          </Box>
        </Fade>
      )}

      {/* Empty state */}
      {!loading && !searched && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <SearchIcon sx={{ fontSize: 64, color: 'rgba(255,255,255,0.1)', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Tìm kiếm tài liệu PDF
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Nhập từ khóa để tìm kiếm trong toàn bộ nội dung PDF đã upload
          </Typography>
        </Box>
      )}
    </Box>
  );
}
