import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { NotificationProvider } from './shared/components/NotificationContext.tsx'
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <NotificationProvider>
                <App />
            </NotificationProvider>
        </BrowserRouter>
    </StrictMode>
)
