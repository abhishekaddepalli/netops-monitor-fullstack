import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, Plus, Map, Trash2, Edit2, Loader2, ArrowRight } from 'lucide-react';
import { getMaps, createMap, deleteMap } from '../api/maps';
import { useToast } from '../context/ToastContext';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';

export default function NetworkMaps() {
  const [maps, setMaps] = useState(null);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    loadMaps();
  }, []);

  const loadMaps = () => {
    getMaps()
      .then(res => setMaps(res.maps || []))
      .catch(err => toast.error('Failed to load network maps'));
  };

  const filteredMaps = (maps || []).filter(m => 
    !search.trim() || m.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newMapName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await createMap({ name: newMapName });
      toast.success('Map created successfully');
      navigate(`/network-maps/${res.map.id}`);
    } catch (err) {
      toast.error('Failed to create map');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this map?')) return;
    try {
      await deleteMap(id);
      toast.success('Map deleted');
      setMaps(maps.filter(m => m.id !== id));
    } catch (err) {
      toast.error('Failed to delete map');
    }
  };

  return (
    <div className="page-container">
      <div className="detail-header" style={{ marginBottom: 24 }}>
        <div>
          <div className="detail-title">Network Maps</div>
          <div className="panel-sub" style={{ marginTop: 4 }}>
            Visual network topologies &bull; NOC monitoring &bull; Live device connectivity
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-box" style={{ maxWidth: 220 }}>
            <input
              placeholder="Search maps..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => setIsCreating(true)} style={{ gap: 6 }}>
            <Plus size={16} /> Create Map
          </button>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        {maps === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Loader2 className="animate-spin text-primary-500" size={32} />
          </div>
        ) : filteredMaps.length === 0 ? (
          <div className="panel" style={{ padding: 48 }}>
            <EmptyState 
              icon={Map} 
              title={search ? "No matching maps found" : "No Network Maps"} 
              description={search ? "Try adjusting your search query." : "Create an interactive topology map to monitor your infrastructure visually."}
              action={!search && (
                <button className="btn btn-primary btn-sm" onClick={() => setIsCreating(true)}>
                  <Plus size={14} /> Create Your First Map
                </button>
              )}
            />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {filteredMaps.map(map => (
              <div 
                key={map.id} 
                className="panel" 
                style={{ cursor: 'pointer', transition: 'all 0.2s ease', overflow: 'hidden', border: '1px solid var(--navy-700)' }}
                onClick={() => navigate(`/network-maps/${map.id}`)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--navy-700)'; }}
              >
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(56, 189, 248, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                        <Network size={22} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--white-100)', margin: 0 }}>{map.name}</h3>
                        <div style={{ fontSize: 12, color: 'var(--white-50)', marginTop: 3 }}>
                          {map.nodes_count ?? 0} Devices &bull; {map.links_count ?? 0} Links
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleDelete(e, map.id)}
                      style={{ color: 'var(--white-40)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--white-40)'}
                      title="Delete Map"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--navy-800)' }}>
                    <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600 }}>NOC Topology Live</span>
                    <div style={{ fontSize: 12, color: 'var(--white-80)', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                      Open Editor <ArrowRight size={13} color="#38bdf8" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isCreating && (
        <Modal title="Create Network Map" onClose={() => setIsCreating(false)}>
          <form onSubmit={handleCreate}>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className="input-label" style={{ marginBottom: 0 }}>Map Name</label>
              <input 
                className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                placeholder="e.g. Core Network Datacenter 1" 
                value={newMapName} 
                onChange={(e) => setNewMapName(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsCreating(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting || !newMapName.trim()}>
                {isSubmitting ? 'Creating...' : 'Create Map'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
