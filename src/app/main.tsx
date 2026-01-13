import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { LanguageProvider } from './context/LanguageContext'
import { ThemeProvider } from "./context/ThemeProvider"
import { AuthProvider } from './context/AuthContext'
import { UserPreferencesProvider } from './context/UserPreferencesContext'
import '../styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AuthProvider>
                <UserPreferencesProvider>
                    <LanguageProvider>
                        <App />
                    </LanguageProvider>
                </UserPreferencesProvider>
            </AuthProvider>
        </ThemeProvider>
    </React.StrictMode>,
)

