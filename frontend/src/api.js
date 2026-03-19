import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // 2 phút cho upload PDF lớn
});

export async function uploadPdf(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  return response.data;
}

export async function searchDocuments(query, docType = 'all') {
  const response = await api.get('/search', { params: { q: query, type: docType } });
  return response.data;
}

export async function getDocuments(docType = 'all') {
  const response = await api.get('/documents', { params: { type: docType } });
  return response.data;
}

export async function getDocument(id) {
  const response = await api.get(`/documents/${id}`);
  return response.data;
}

export async function deleteDocument(id) {
  const response = await api.delete(`/documents/${id}`);
  return response.data;
}

export async function getStats() {
  const response = await api.get('/stats');
  return response.data;
}
