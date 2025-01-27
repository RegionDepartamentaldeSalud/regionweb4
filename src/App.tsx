import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import TaskDetails from './pages/TaskDetails';
import Calendar from './pages/Calendar';
import OfficeNumbers from './pages/OfficeNumbers';
import DigitalOfficeDocuments from './pages/DigitalOfficeDocuments';
import OfficeDatabase from './pages/OfficeDatabase';
import Achievements from './pages/Achievements';
import AchievementDetails from './pages/AchievementDetails';
import Auth from './pages/Auth';
import Account from './pages/settings/Account';
import Theme from './pages/settings/Theme';
import Language from './pages/settings/Language';
import Terms from './pages/settings/Terms';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <LanguageProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="tasks/:taskId" element={<TaskDetails />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="office-numbers" element={<OfficeNumbers />} />
              <Route path="digital-office-documents" element={<DigitalOfficeDocuments />} />
              <Route path="office-database" element={<OfficeDatabase />} />
              <Route path="achievements" element={<Achievements />} />
              <Route path="achievements/:achievementId" element={<AchievementDetails />} />
              <Route path="settings/account" element={<Account />} />
              <Route path="settings/theme" element={<Theme />} />
              <Route path="settings/language" element={<Language />} />
              <Route path="settings/terms" element={<Terms />} />
            </Route>
          </Routes>
          <Toaster position="top-right" />
        </LanguageProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;