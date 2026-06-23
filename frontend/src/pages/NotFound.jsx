import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <Compass size={32} style={{ color: 'var(--chakra-400)', marginBottom: 12 }} />
        <div className="auth-title">Page not found</div>
        <div className="auth-sub">The page you're looking for doesn't exist.</div>
        <Link to="/" className="btn btn-primary btn-block">Back to Dashboard</Link>
      </div>
    </div>
  );
}
