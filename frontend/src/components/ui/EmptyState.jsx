import { Inbox } from 'lucide-react';

export default function EmptyState({ icon, title, subtitle, action }) {
  const Icon = icon || Inbox;
  return (
    <div className="empty-state">
      <Icon />
      <div className="empty-state-title">{title}</div>
      {subtitle && <div className="empty-state-sub">{subtitle}</div>}
      {action}
    </div>
  );
}
