import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Navigate } from 'react-router-dom';
import { Routes, Route } from 'react-router-dom';
import { Auth } from './features/auth/Auth'
import { Courses } from './features/courses/courses';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/auth" />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/courses" element={<Courses />} />
      </Routes>
    </BrowserRouter>
    <Toaster position="bottom-center" toastOptions={{ style: { marginBottom: 24 } }}/>
  </StrictMode>,
)
