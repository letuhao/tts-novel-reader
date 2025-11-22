import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import ErrorBoundary from './components/Common/ErrorBoundary'
import LibraryPage from './pages/LibraryPage'
import ReaderPage from './pages/ReaderPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route 
              path="/" 
              element={
                <ErrorBoundary>
                  <LibraryPage />
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/novel/:id" 
              element={
                <ErrorBoundary>
                  <ReaderPage />
                </ErrorBoundary>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ErrorBoundary>
                  <SettingsPage />
                </ErrorBoundary>
              } 
            />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App

