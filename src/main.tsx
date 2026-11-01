import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ENTITIES } from './entities'
import { reportEntityProblems } from './entities/validate'
import { revealEngine } from './motion/reveal'
import { triggers } from './store/triggers'
import { progress } from './store/progress'

if (import.meta.env.DEV) {
  // Fail loudly in dev on typos / dangling references in the entity data.
  // The same validator runs in tests (tests/entities-validate.test.ts).
  reportEntityProblems(ENTITIES)
  // Console handle for poking the chain while developing:
  //   __notebook.revealEngine.pauseAll() / resumeAll()
  //   __notebook.triggers.play('welcome-2')
  //   __notebook.progress.reset()
  ;(window as unknown as { __notebook: unknown }).__notebook = { revealEngine, triggers, progress, entities: ENTITIES }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
