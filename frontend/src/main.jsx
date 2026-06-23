
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
import './styles/app.css';

// Fetch whitelabel settings before rendering
fetch('/api/global-settings')
  .then((res) => res.json())
  .then((settings) => {
    if (settings.app_name) {
      document.title = settings.app_name;
      window.APP_NAME = settings.app_name;
    }
    if (settings.primary_color) {
      document.documentElement.style.setProperty('--primary-500', settings.primary_color);
      document.documentElement.style.setProperty('--primary-600', settings.primary_color);
    }
    if (settings.app_logo) {
      window.APP_LOGO = settings.app_logo;
    }
    if (settings.app_favicon) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.app_favicon;
    }
    if (settings.custom_css) {
      const style = document.createElement('style');
      style.innerHTML = settings.custom_css;
      document.head.appendChild(style);
    }
    window.APP_TIMEZONE = settings.timezone || 'UTC';
    window.APP_TIME_FORMAT = settings.time_format || '24h';
  })
  .catch(() => console.error('Failed to load global settings'))
  .finally(() => {
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });
