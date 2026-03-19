import { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Tabs, Tab, Stack, Paper, Chip,
  AppBar, Toolbar, CssBaseline
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import {
  CloudUpload as UploadIcon,
  Search as SearchIcon,
  FolderOpen as FolderIcon,
  AutoAwesome as AiIcon,
} from '@mui/icons-material';
import theme from './theme';
import UploadTab from './components/UploadTab';
import SearchTab from './components/SearchTab';
import DocumentsTab from './components/DocumentsTab';
import DocumentDetail from './components/DocumentDetail';
import { getStats } from './api';

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [detailDocId, setDetailDocId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [stats, setStats] = useState({ total: 0, by_type: {} });
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchStats = async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshKey]);

  const handleViewDocument = (docId) => {
    setDetailDocId(docId);
    setDetailOpen(true);
  };

  const handleUploadSuccess = () => {
    setRefreshKey((k) => k + 1);
    fetchStats();
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0A0E1A 0%, #0F1629 50%, #0A0E1A 100%)',
      }}>
        {/* Header */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'rgba(10, 14, 26, 0.8)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Toolbar>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1 }}>
              <AiIcon sx={{
                fontSize: 32,
                background: 'linear-gradient(135deg, #7C4DFF, #FF9100)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }} />
              <Typography variant="h6" fontWeight={700} sx={{
                background: 'linear-gradient(135deg, #E8EAED, #9AA0A6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                PDF Agent
              </Typography>
              <Chip
                label="Gemini AI"
                size="small"
                sx={{
                  bgcolor: 'rgba(124, 77, 255, 0.15)',
                  color: '#B47CFF',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              />
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                label={`${stats.total} tài liệu`}
                variant="outlined"
                size="small"
                sx={{ borderColor: 'rgba(255,255,255,0.15)', color: 'text.secondary' }}
              />
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Stats bar */}
        {stats.total > 0 && (
          <Box sx={{
            px: 3, py: 1.5,
            bgcolor: 'rgba(124, 77, 255, 0.04)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="center">
              {Object.entries(stats.by_type).map(([type, count]) => {
                const labels = {
                  quotation: 'Báo giá', price_list: 'Bảng giá', contract: 'Hợp đồng',
                  invoice: 'Hóa đơn', report: 'Báo cáo', letter: 'Công văn', other: 'Khác'
                };
                return (
                  <Typography key={type} variant="caption" color="text.secondary">
                    {labels[type] || type}: <strong>{count}</strong>
                  </Typography>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* Navigation Tabs */}
        <Container maxWidth="lg" sx={{ mt: 3 }}>
          <Paper sx={{
            bgcolor: 'rgba(255,255,255,0.02)',
            borderRadius: 3,
            border: '1px solid rgba(255,255,255,0.06)',
            mb: 3,
          }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              centered
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  py: 2,
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: 2,
                  background: 'linear-gradient(90deg, #7C4DFF, #536DFE)',
                },
              }}
            >
              <Tab icon={<UploadIcon />} iconPosition="start" label="Upload PDF" />
              <Tab icon={<SearchIcon />} iconPosition="start" label="Tìm kiếm" />
              <Tab icon={<FolderIcon />} iconPosition="start" label="Tất cả tài liệu" />
            </Tabs>
          </Paper>

          {/* Tab content */}
          <Box sx={{ pb: 4 }}>
            {activeTab === 0 && <UploadTab onUploadSuccess={handleUploadSuccess} />}
            {activeTab === 1 && <SearchTab onViewDocument={handleViewDocument} />}
            {activeTab === 2 && (
              <DocumentsTab
                onViewDocument={handleViewDocument}
                refreshKey={refreshKey}
              />
            )}
          </Box>
        </Container>

        {/* Document Detail Dialog */}
        <DocumentDetail
          docId={detailDocId}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;
