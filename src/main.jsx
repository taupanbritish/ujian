import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { SekolahProvider } from './context/SekolahContext'
import { ToastProvider } from './context/ToastContext'
import { SoundProvider } from './context/SoundContext'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 15000,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SekolahProvider>
          <AuthProvider>
            <SoundProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </SoundProvider>
          </AuthProvider>
        </SekolahProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)