import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './App.css'
import './styles.css'
import App from './App.tsx'
import { StoreProvider } from './store/StoreContext'
import { AuthProvider } from './store/AuthContext'
import { ProductsProvider } from './store/ProductsContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ProductsProvider>
          <StoreProvider>
            <App />
          </StoreProvider>
        </ProductsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
