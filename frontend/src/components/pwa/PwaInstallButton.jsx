import { useState, useEffect } from 'react';
import { Download, Check, Smartphone, Monitor } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function PwaInstallButton({ variant = 'sidebar', className = '' }) {
  const toast = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success('NetOps Monitor App installed successfully!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // If already installed or on iOS where prompt isn't supported programmatically
      if (isInstalled) {
        toast.info('NetOps Monitor is already installed on this device.');
      } else {
        toast.info('To install on iOS: Tap Share and choose "Add to Home Screen". On desktop: Click the Install icon in the browser address bar.');
      }
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled && variant === 'banner') {
    return null;
  }

  if (variant === 'sidebar') {
    return (
      <button 
        type="button"
        onClick={handleInstallClick}
        className={`btn btn-ghost ${className}`}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          justifyContent: 'center',
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(14, 165, 233, 0.05) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 13,
          color: 'var(--primary-400)',
          fontWeight: 600,
          cursor: 'pointer',
          marginTop: 8
        }}
        title="Install NetOps Monitor Desktop / Mobile PWA App"
      >
        <Download size={14} />
        <span>{isInstalled ? 'App Installed' : 'Install PWA App'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleInstallClick}
      className={`btn btn-primary ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
    >
      <Download size={15} />
      <span>Install PWA App</span>
    </button>
  );
}
