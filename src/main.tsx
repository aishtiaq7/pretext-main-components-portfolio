import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ENTITIES } from './entities'
import { reportEntityProblems } from './entities/validate'

// Fail loudly in dev on typos / dangling references in the entity data.
// The same validator runs in tests (tests/entities-validate.test.ts).
if (import.meta.env.DEV) reportEntityProblems(ENTITIES)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
