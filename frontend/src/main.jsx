import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import axios from 'axios'
import { AuthProvider } from './contexts/AuthContext'

// Настройка axios для работы с API бэкенда
axios.defaults.baseURL = 'http://localhost:8081/api';

// Add global error handler for debugging
axios.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.message, error.response?.data);
    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
