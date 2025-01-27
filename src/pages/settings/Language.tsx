import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function Language() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">{t('language')}</h2>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              id="es"
              name="language"
              type="radio"
              checked={language === 'es'}
              onChange={() => setLanguage('es')}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="es" className="ml-3">
              <span className="block text-sm font-medium text-gray-700">{t('spanish')}</span>
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="en"
              name="language"
              type="radio"
              checked={language === 'en'}
              onChange={() => setLanguage('en')}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="en" className="ml-3">
              <span className="block text-sm font-medium text-gray-700">{t('english')}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}