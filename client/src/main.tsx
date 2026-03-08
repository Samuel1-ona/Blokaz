import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { StarknetProvider } from './providers/StarknetProvider.tsx'
import { DenshokanWrapper } from './providers/DenshokanWrapper.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StarknetProvider>
      <DenshokanWrapper>
        <App />
      </DenshokanWrapper>
    </StarknetProvider>
  </StrictMode>,
)
