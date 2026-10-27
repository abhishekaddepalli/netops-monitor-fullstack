import { useEffect, useState, useCallback } from 'react';
import { 
  Globe, Plus, Trash2, ArrowUp, ArrowDown, Eye, Save, RotateCcw, 
  ExternalLink, Layers, Sliders, DollarSign, Layout, Image as ImageIcon, 
  Type, HelpCircle, Sparkles, Check, ChevronDown, ChevronRight, BarChart2 
} from 'lucide-react';
import { apiClient, apiErrorMessage } from '../api/client';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';

const AVAILABLE_BLOCKS = [
  { type: 'heading', name: 'Heading / Hero Section', icon: Layout, desc: 'Eye-catching title, badge, subtitle, and CTA buttons' },
  { type: 'sliders', name: 'Sliders / Carousel', icon: Sliders, desc: 'Interactive slide deck with multiple feature cards' },
  { type: 'pricing', name: 'Dynamic Pricing Table', icon: DollarSign, desc: 'Real-time connected pricing plans with billing cycles' },
  { type: 'features', name: 'Features Grid', icon: Layers, desc: 'Responsive grid of platform capability cards' },
  { type: 'image', name: 'Image / Banner', icon: ImageIcon, desc: 'Visual media asset with caption and link' },
  { type: 'text', name: 'Text / Article Block', icon: Type, desc: 'Rich content paragraphs, headers, and descriptions' },
  { type: 'faq', name: 'FAQ Accordion', icon: HelpCircle, desc: 'Expandable frequently asked questions and answers' },
  { type: 'cta', name: 'Call to Action Banner', icon: Sparkles, desc: 'High-conversion banner with gradient and button' },
  { type: 'stats', name: 'Metrics & Stats', icon: BarChart2, desc: 'Showcase uptime %, checkpoints, and speed numbers' },
];

export default function AdminCms() {
  const toast = useToast();
  const [pages, setPages] = useState(null);
  const [selectedPage, setSelectedPage] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [pageMeta, setPageMeta] = useState({ title: '', slug: '', meta_title: '', meta_description: '', is_published: true });
  const [saving, setSaving] = useState(false);
  const [showAddElementModal, setShowAddElementModal] = useState(false);
  const [showNewPageModal, setShowNewPageModal] = useState(false);
  const [newPageData, setNewPageData] = useState({ title: '', slug: '' });
  const [expandedBlockId, setExpandedBlockId] = useState(null);

  const loadPages = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/v1/admin/cms/pages');
      setPages(data || []);
      if (data && data.length > 0) {
        const current = selectedPage ? data.find(p => p.id === selectedPage.id) || data[0] : data[0];
        selectPage(current);
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to load CMS pages.'));
    }
  }, [selectedPage, toast]);

  useEffect(() => {
    loadPages();
  }, []);

  const selectPage = (page) => {
    setSelectedPage(page);
    setBlocks(Array.isArray(page.blocks) ? page.blocks : []);
    setPageMeta({
      title: page.title || '',
      slug: page.slug || '',
      meta_title: page.meta_title || '',
      meta_description: page.meta_description || '',
      is_published: page.is_published !== false,
    });
    if (page.blocks && page.blocks.length > 0) {
      setExpandedBlockId(page.blocks[0].id);
    }
  };

  const handleSave = async () => {
    if (!selectedPage) return;
    setSaving(true);
    try {
      const payload = {
        ...pageMeta,
        blocks: blocks,
      };
      const { data } = await apiClient.patch(`/v1/admin/cms/pages/${selectedPage.id}`, payload);
      toast.success('Page changes published successfully!');
      setSelectedPage(data);
      // Refresh pages list
      const res = await apiClient.get('/v1/admin/cms/pages');
      setPages(res.data || []);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to save page changes.'));
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = async () => {
    if (!selectedPage) return;
    if (!confirm(`Reset all blocks on "${selectedPage.title}" to default template? Your custom changes on this page will be replaced.`)) return;
    try {
      const { data } = await apiClient.post(`/v1/admin/cms/pages/${selectedPage.id}/reset-default`);
      toast.success('Page reset to default template.');
      selectPage(data.page);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to reset page.'));
    }
  };

  const handleCreatePage = async (e) => {
    e.preventDefault();
    if (!newPageData.title.trim()) return;
    try {
      const { data } = await apiClient.post('/v1/admin/cms/pages', newPageData);
      toast.success('New page created!');
      setShowNewPageModal(false);
      setNewPageData({ title: '', slug: '' });
      const res = await apiClient.get('/v1/admin/cms/pages');
      setPages(res.data || []);
      selectPage(data);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to create page.'));
    }
  };

  const handleDeletePage = async (page) => {
    if (page.slug === 'home') {
      toast.error('The Home Landing Page cannot be deleted.');
      return;
    }
    if (!confirm(`Are you sure you want to delete "${page.title}"?`)) return;
    try {
      await apiClient.delete(`/v1/admin/cms/pages/${page.id}`);
      toast.success('Page deleted.');
      const res = await apiClient.get('/v1/admin/cms/pages');
      setPages(res.data || []);
      if (res.data.length > 0) selectPage(res.data[0]);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to delete page.'));
    }
  };

  // Block management helpers
  const moveBlock = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(index, 1);
    newBlocks.splice(newIndex, 0, moved);
    setBlocks(newBlocks);
  };

  const deleteBlock = (index) => {
    if (!confirm('Remove this block from page?')) return;
    const newBlocks = blocks.filter((_, i) => i !== index);
    setBlocks(newBlocks);
  };

  const updateBlockData = (index, newData) => {
    const newBlocks = [...blocks];
    newBlocks[index] = {
      ...newBlocks[index],
      data: { ...newBlocks[index].data, ...newData }
    };
    setBlocks(newBlocks);
  };

  const addBlock = (type) => {
    const id = `${type}-${Date.now()}`;
    let defaultData = {};

    switch (type) {
      case 'heading':
        defaultData = {
          badge: '⚡ New Announcement',
          title: 'Enter Section Heading',
          highlight: 'Highlight Words',
          subtitle: 'Detailed description text for this section.',
          primary_button_text: 'Get Started',
          primary_button_link: '/register',
          secondary_button_text: 'Learn More',
          secondary_button_link: '/login',
          align: 'center',
        };
        break;
      case 'image':
        defaultData = {
          url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop',
          caption: 'High-performance cloud server infrastructure',
          aspect_ratio: '16/9',
          border_radius: '16px',
        };
        break;
      case 'text':
        defaultData = {
          title: 'Content Section',
          content: 'Add detailed paragraphs, instructions, or documentation here. This block supports multi-line text and rich formatting.',
          align: 'left',
        };
        break;
      case 'sliders':
        defaultData = {
          title: 'Interactive Feature Slider',
          subtitle: 'Swipe or click through our platform highlights.',
          slides: [
            { id: 's1', badge: 'Highlight 1', title: 'Slide Title One', description: 'Description of the first feature.', button_text: 'Explore', button_link: '/register' },
            { id: 's2', badge: 'Highlight 2', title: 'Slide Title Two', description: 'Description of the second feature.', button_text: 'Discover', button_link: '/register' }
          ]
        };
        break;
      case 'pricing':
        defaultData = {
          title: 'Simple, Transparent Pricing',
          subtitle: 'Start for free, upgrade when you need more power.',
          show_cycle_toggle: true,
        };
        break;
      case 'features':
        defaultData = {
          title: 'Platform Capabilities',
          subtitle: 'Designed for enterprise reliability and scale.',
          items: [
            { icon: 'Activity', title: 'HTTP/HTTPS Monitoring', description: 'Monitor web endpoints with custom headers.' },
            { icon: 'ShieldCheck', title: 'SSL Health Guard', description: 'Automatic alerts before certificate expiration.' },
            { icon: 'Bell', title: 'Multi-Channel Alerts', description: 'Instant alerts via WhatsApp, Telegram, and Email.' }
          ]
        };
        break;
      case 'faq':
        defaultData = {
          title: 'Frequently Asked Questions',
          subtitle: 'Common questions and answers for our customers.',
          items: [
            { q: 'How does monitoring work?', a: 'Our distributed global network pings your servers at set intervals.' },
            { q: 'Can I change my plan later?', a: 'Yes, you can upgrade, downgrade, or cancel anytime from Billing.' }
          ]
        };
        break;
      case 'cta':
        defaultData = {
          title: 'Ready to Get Started?',
          subtitle: 'Set up your first monitor in under 30 seconds.',
          button_text: 'Create Free Account',
          button_link: '/register',
        };
        break;
      case 'stats':
        defaultData = {
          items: [
            { label: 'Uptime SLA', value: '99.99%' },
            { label: 'Monitoring Nodes', value: '150+' },
            { label: 'Checks per Day', value: '10M+' },
            { label: 'Response Time', value: '< 200ms' }
          ]
        };
        break;
      default:
        break;
    }

    const newBlock = { id, type, data: defaultData };
    setBlocks([...blocks, newBlock]);
    setExpandedBlockId(id);
    setShowAddElementModal(false);
    toast.success(`Added ${type} block to page.`);
  };

  return (
    <>
      <div className="detail-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="detail-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={22} color="var(--primary-400)" /> Site CMS & Visual Page Editor
          </div>
          <div className="panel-sub" style={{ marginTop: 4 }}>
            Customize all website pages, hero sections, sliders, and live connected pricing tables
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {selectedPage && (
            <>
              <a
                href={selectedPage.slug === 'home' ? '/' : `/page/${selectedPage.slug}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                title="Preview page on live site"
              >
                <ExternalLink size={14} /> Preview Live
              </a>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleResetDefault}
                title="Reset blocks to default template"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <RotateCcw size={14} /> Reset
              </button>
            </>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !selectedPage}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Save size={15} /> {saving ? 'Publishing...' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {pages === null ? (
        <Skeleton height={400} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 280px) 1fr', gap: 24, alignItems: 'start' }} className="cms-layout-grid">
          {/* Pages Sidebar List */}
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--navy-700)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white-90)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Site Pages ({pages.length})
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowNewPageModal(true)}
                style={{ padding: '4px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <Plus size={13} /> New Page
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pages.map((p) => {
                const isSelected = selectedPage?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => selectPage(p)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                      background: isSelected ? 'var(--primary-600)' : 'rgba(255, 255, 255, 0.03)',
                      color: isSelected ? '#fff' : 'var(--text-main)',
                      border: isSelected ? '1px solid var(--primary-400)' : '1px solid transparent',
                      transition: 'all 0.2s ease', userSelect: 'none'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</div>
                      <div style={{ fontSize: 11, opacity: 0.75, fontFamily: 'var(--font-mono)' }}>
                        /{p.slug === 'home' ? '' : p.slug}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {p.slug === 'home' ? (
                        <span style={{ fontSize: 10, background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                          HOME
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="icon-btn-sm"
                          onClick={(e) => { e.stopPropagation(); handleDeletePage(p); }}
                          style={{ color: isSelected ? '#fff' : '#f87171', opacity: 0.8 }}
                          title="Delete Page"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Page Details & Blocks Editor */}
          {selectedPage && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Page Meta Header Settings */}
              <div className="panel" style={{ padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--white-90)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Globe size={16} color="var(--primary-400)" /> Page SEO & URL Settings
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Page Title</label>
                    <input
                      type="text"
                      className="form-input"
                      value={pageMeta.title}
                      onChange={(e) => setPageMeta({ ...pageMeta, title: e.target.value })}
                      placeholder="e.g. Home Landing Page"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">URL Slug</label>
                    <input
                      type="text"
                      className="form-input"
                      value={pageMeta.slug}
                      disabled={selectedPage.slug === 'home'}
                      onChange={(e) => setPageMeta({ ...pageMeta, slug: e.target.value })}
                      placeholder="e.g. features or pricing"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Meta Title (Browser Tab)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={pageMeta.meta_title}
                      onChange={(e) => setPageMeta({ ...pageMeta, meta_title: e.target.value })}
                      placeholder="SEO Title"
                    />
                  </div>

                  <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--navy-600)', width: '100%' }}>
                      <input
                        type="checkbox"
                        checked={pageMeta.is_published}
                        onChange={(e) => setPageMeta({ ...pageMeta, is_published: e.target.checked })}
                        style={{ width: 18, height: 18, accentColor: 'var(--primary-500)' }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Page Published</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Elements & Blocks List */}
              <div className="panel" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
                      Page Elements & Content Blocks ({blocks.length})
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Add, reorder, customize, and configure visual elements for this page
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowAddElementModal(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Plus size={16} /> Add Element
                  </button>
                </div>

                {blocks.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--white-50)', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed var(--navy-600)' }}>
                    No elements on this page yet. Click "Add Element" to add Headings, Sliders, Dynamic Pricing, or Features.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {blocks.map((block, idx) => {
                      const isExpanded = expandedBlockId === block.id;
                      const blockMeta = AVAILABLE_BLOCKS.find(b => b.type === block.type) || { name: block.type, icon: Layout };
                      const Icon = blockMeta.icon;

                      return (
                        <div
                          key={block.id || idx}
                          style={{
                            background: 'var(--navy-800)',
                            border: isExpanded ? '1px solid var(--primary-500)' : '1px solid var(--navy-600)',
                            borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s',
                          }}
                        >
                          {/* Block Header Row */}
                          <div
                            style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '14px 18px', background: isExpanded ? 'rgba(56, 189, 248, 0.08)' : 'rgba(0,0,0,0.15)',
                              cursor: 'pointer', userSelect: 'none'
                            }}
                            onClick={() => setExpandedBlockId(isExpanded ? null : block.id)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ color: 'var(--primary-400)', display: 'flex', alignItems: 'center' }}>
                                <Icon size={18} />
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)' }}>
                                  {blockMeta.name}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                  {block.data?.title || block.data?.badge || `Block #${idx + 1}`}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="icon-btn-sm"
                                disabled={idx === 0}
                                onClick={() => moveBlock(idx, -1)}
                                title="Move Up"
                                style={{ opacity: idx === 0 ? 0.3 : 1 }}
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                type="button"
                                className="icon-btn-sm"
                                disabled={idx === blocks.length - 1}
                                onClick={() => moveBlock(idx, 1)}
                                title="Move Down"
                                style={{ opacity: idx === blocks.length - 1 ? 0.3 : 1 }}
                              >
                                <ArrowDown size={14} />
                              </button>
                              <button
                                type="button"
                                className="icon-btn-sm"
                                onClick={() => deleteBlock(idx)}
                                title="Delete Block"
                                style={{ color: '#f87171' }}
                              >
                                <Trash2 size={14} />
                              </button>
                              <div 
                                style={{ color: 'var(--white-50)', padding: '0 4px', cursor: 'pointer' }}
                                onClick={() => setExpandedBlockId(isExpanded ? null : block.id)}
                              >
                                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                              </div>
                            </div>
                          </div>

                          {/* Block Body / Inline Editor */}
                          {isExpanded && (
                            <div style={{ padding: '18px 20px', borderTop: '1px solid var(--navy-700)', background: 'var(--navy-900)' }}>
                              <BlockEditorFields
                                block={block}
                                onChange={(newData) => updateBlockData(idx, newData)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Element Modal */}
      {showAddElementModal && (
        <Modal
          title="Add Visual Element to Page"
          onClose={() => setShowAddElementModal(false)}
          maxWidth="720px"
          footer={
            <button type="button" className="btn btn-ghost" onClick={() => setShowAddElementModal(false)}>
              Cancel
            </button>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {AVAILABLE_BLOCKS.map((elem) => {
              const Icon = elem.icon;
              return (
                <div
                  key={elem.type}
                  onClick={() => addBlock(elem.type)}
                  style={{
                    background: 'var(--navy-800)', border: '1px solid var(--navy-600)',
                    borderRadius: 14, padding: 16, cursor: 'pointer', display: 'flex', gap: 14,
                    alignItems: 'flex-start', transition: 'all 0.2s', userSelect: 'none'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary-400)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--navy-600)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ padding: 10, borderRadius: 10, background: 'rgba(56, 189, 248, 0.1)', color: 'var(--primary-400)', flexShrink: 0 }}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)', marginBottom: 4 }}>
                      {elem.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {elem.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {/* Create New Page Modal */}
      {showNewPageModal && (
        <Modal
          title="Create New Site Page"
          onClose={() => setShowNewPageModal(false)}
          maxWidth="500px"
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setShowNewPageModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleCreatePage}>
                Create Page
              </button>
            </>
          }
        >
          <form onSubmit={handleCreatePage} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Page Title <span style={{ color: '#f87171' }}>*</span></label>
              <input
                type="text"
                className="form-input"
                value={newPageData.title}
                onChange={(e) => setNewPageData({ ...newPageData, title: e.target.value })}
                placeholder="e.g. About Us, Solutions, Status"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">URL Slug (leave blank to auto-generate)</label>
              <input
                type="text"
                className="form-input"
                value={newPageData.slug}
                onChange={(e) => setNewPageData({ ...newPageData, slug: e.target.value })}
                placeholder="e.g. about-us"
              />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

/**
 * Fields Editor for each individual Block Type
 */
function BlockEditorFields({ block, onChange }) {
  const data = block.data || {};

  switch (block.type) {
    case 'heading':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Announcement Badge</label>
            <input
              type="text"
              className="form-input"
              value={data.badge || ''}
              onChange={(e) => onChange({ badge: e.target.value })}
              placeholder="e.g. ⚡ 99.99% Uptime Guarantee"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Main Title Line</label>
              <input
                type="text"
                className="form-input"
                value={data.title || ''}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder="Downtime Happens."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Highlight Words (Gradient Color)</label>
              <input
                type="text"
                className="form-input"
                value={data.highlight || ''}
                onChange={(e) => onChange({ highlight: e.target.value })}
                placeholder="Get Alerted Instantly."
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Subtitle / Description</label>
            <textarea
              className="form-input"
              rows={3}
              value={data.subtitle || ''}
              onChange={(e) => onChange({ subtitle: e.target.value })}
              placeholder="Detailed explanation of the platform..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Primary Button Text</label>
              <input
                type="text"
                className="form-input"
                value={data.primary_button_text || ''}
                onChange={(e) => onChange({ primary_button_text: e.target.value })}
                placeholder="Start Monitoring Free"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Primary Button Link</label>
              <input
                type="text"
                className="form-input"
                value={data.primary_button_link || ''}
                onChange={(e) => onChange({ primary_button_link: e.target.value })}
                placeholder="/register"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Secondary Button Text</label>
              <input
                type="text"
                className="form-input"
                value={data.secondary_button_text || ''}
                onChange={(e) => onChange({ secondary_button_text: e.target.value })}
                placeholder="Explore Live Demo"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Secondary Button Link</label>
              <input
                type="text"
                className="form-input"
                value={data.secondary_button_link || ''}
                onChange={(e) => onChange({ secondary_button_link: e.target.value })}
                placeholder="/login"
              />
            </div>
          </div>
        </div>
      );

    case 'sliders':
      const slides = Array.isArray(data.slides) ? data.slides : [];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Section Title</label>
              <input
                type="text"
                className="form-input"
                value={data.title || ''}
                onChange={(e) => onChange({ title: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Section Subtitle</label>
              <input
                type="text"
                className="form-input"
                value={data.subtitle || ''}
                onChange={(e) => onChange({ subtitle: e.target.value })}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--navy-700)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-400)' }}>
                Slide Deck Items ({slides.length})
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  const newSlides = [...slides, {
                    id: `slide-${Date.now()}`,
                    badge: 'Feature',
                    title: 'New Slide Title',
                    description: 'Slide description goes here.',
                    button_text: 'Explore',
                    button_link: '/register'
                  }];
                  onChange({ slides: newSlides });
                }}
              >
                + Add Slide
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {slides.map((slide, sIdx) => (
                <div key={slide.id || sIdx} style={{ background: 'var(--navy-800)', border: '1px solid var(--navy-600)', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--white-80)' }}>Slide #{sIdx + 1}</span>
                    <button
                      type="button"
                      className="icon-btn-sm"
                      style={{ color: '#f87171' }}
                      onClick={() => {
                        const newSlides = slides.filter((_, i) => i !== sIdx);
                        onChange({ slides: newSlides });
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Badge Tag"
                      value={slide.badge || ''}
                      onChange={(e) => {
                        const newSlides = [...slides];
                        newSlides[sIdx] = { ...slide, badge: e.target.value };
                        onChange({ slides: newSlides });
                      }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Slide Title"
                      value={slide.title || ''}
                      onChange={(e) => {
                        const newSlides = [...slides];
                        newSlides[sIdx] = { ...slide, title: e.target.value };
                        onChange({ slides: newSlides });
                      }}
                    />
                  </div>

                  <textarea
                    className="form-input"
                    rows={2}
                    style={{ marginTop: 10 }}
                    placeholder="Slide description text..."
                    value={slide.description || ''}
                    onChange={(e) => {
                      const newSlides = [...slides];
                      newSlides[sIdx] = { ...slide, description: e.target.value };
                      onChange({ slides: newSlides });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'pricing':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--primary-300)' }}>
            ✨ <strong>Live Database Connection:</strong> This pricing component automatically loads all active, public plans directly from your Plans manager. Changing prices or monitor limits in <code>/admin/plans</code> updates this table everywhere across the site in real-time.
          </div>

          <div className="form-group">
            <label className="form-label">Section Title</label>
            <input
              type="text"
              className="form-input"
              value={data.title || ''}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Simple, Transparent Pricing"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Section Subtitle</label>
            <input
              type="text"
              className="form-input"
              value={data.subtitle || ''}
              onChange={(e) => onChange({ subtitle: e.target.value })}
              placeholder="Start for free, upgrade when you need more power."
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--navy-600)', width: 'fit-content' }}>
            <input
              type="checkbox"
              checked={data.show_cycle_toggle !== false}
              onChange={(e) => onChange({ show_cycle_toggle: e.target.checked })}
              style={{ width: 18, height: 18, accentColor: 'var(--primary-500)' }}
            />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Enable Billing Frequency Switcher (Monthly / 6 Months / Yearly)</span>
          </label>
        </div>
      );

    case 'features':
      const items = Array.isArray(data.items) ? data.items : [];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Section Title</label>
              <input
                type="text"
                className="form-input"
                value={data.title || ''}
                onChange={(e) => onChange({ title: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Section Subtitle</label>
              <input
                type="text"
                className="form-input"
                value={data.subtitle || ''}
                onChange={(e) => onChange({ subtitle: e.target.value })}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--navy-700)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-400)' }}>
                Feature Cards ({items.length})
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  const newItems = [...items, { icon: 'Activity', title: 'New Feature', description: 'Feature description' }];
                  onChange({ items: newItems });
                }}
              >
                + Add Card
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              {items.map((item, fIdx) => (
                <div key={fIdx} style={{ background: 'var(--navy-800)', border: '1px solid var(--navy-600)', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--white-80)' }}>Card #{fIdx + 1}</span>
                    <button
                      type="button"
                      className="icon-btn-sm"
                      style={{ color: '#f87171' }}
                      onClick={() => {
                        const newItems = items.filter((_, i) => i !== fIdx);
                        onChange({ items: newItems });
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Feature Title"
                    value={item.title || ''}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[fIdx] = { ...item, title: e.target.value };
                      onChange({ items: newItems });
                    }}
                    style={{ marginBottom: 6 }}
                  />
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Feature Description"
                    value={item.description || ''}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[fIdx] = { ...item, description: e.target.value };
                      onChange({ items: newItems });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'faq':
      const faqs = Array.isArray(data.items) ? data.items : [];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Section Title</label>
              <input
                type="text"
                className="form-input"
                value={data.title || ''}
                onChange={(e) => onChange({ title: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Section Subtitle</label>
              <input
                type="text"
                className="form-input"
                value={data.subtitle || ''}
                onChange={(e) => onChange({ subtitle: e.target.value })}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--navy-700)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-400)' }}>
                Q&A Accordion Items ({faqs.length})
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  const newFaqs = [...faqs, { q: 'Question?', a: 'Answer here.' }];
                  onChange({ items: newFaqs });
                }}
              >
                + Add FAQ
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {faqs.map((faq, qIdx) => (
                <div key={qIdx} style={{ background: 'var(--navy-800)', border: '1px solid var(--navy-600)', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--white-80)' }}>FAQ #{qIdx + 1}</span>
                    <button
                      type="button"
                      className="icon-btn-sm"
                      style={{ color: '#f87171' }}
                      onClick={() => {
                        const newFaqs = faqs.filter((_, i) => i !== qIdx);
                        onChange({ items: newFaqs });
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Question"
                    value={faq.q || ''}
                    onChange={(e) => {
                      const newFaqs = [...faqs];
                      newFaqs[qIdx] = { ...faq, q: e.target.value };
                      onChange({ items: newFaqs });
                    }}
                    style={{ marginBottom: 6 }}
                  />
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Answer"
                    value={faq.a || ''}
                    onChange={(e) => {
                      const newFaqs = [...faqs];
                      newFaqs[qIdx] = { ...faq, a: e.target.value };
                      onChange({ items: newFaqs });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'image':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Image URL or Local Storage Path</label>
            <input
              type="text"
              className="form-input"
              value={data.url || ''}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="https://images.unsplash.com/... or /storage/media.png"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Image Caption / Subtitle</label>
            <input
              type="text"
              className="form-input"
              value={data.caption || ''}
              onChange={(e) => onChange({ caption: e.target.value })}
              placeholder="Illustration caption"
            />
          </div>
          {data.url && (
            <div style={{ borderRadius: 10, overflow: 'hidden', maxHeight: 220, border: '1px solid var(--navy-600)', background: '#000' }}>
              <img src={data.url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
        </div>
      );

    case 'text':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Section Title</label>
            <input
              type="text"
              className="form-input"
              value={data.title || ''}
              onChange={(e) => onChange({ title: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Content Body (Multi-line text / Markdown)</label>
            <textarea
              className="form-input"
              rows={6}
              value={data.content || ''}
              onChange={(e) => onChange({ content: e.target.value })}
            />
          </div>
        </div>
      );

    case 'cta':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">CTA Title</label>
            <input
              type="text"
              className="form-input"
              value={data.title || ''}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Ready to eliminate downtime surprises?"
            />
          </div>
          <div className="form-group">
            <label className="form-label">CTA Subtitle</label>
            <input
              type="text"
              className="form-input"
              value={data.subtitle || ''}
              onChange={(e) => onChange({ subtitle: e.target.value })}
              placeholder="Join thousands of teams..."
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Button Text</label>
              <input
                type="text"
                className="form-input"
                value={data.button_text || ''}
                onChange={(e) => onChange({ button_text: e.target.value })}
                placeholder="Get Started Free"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Button Link</label>
              <input
                type="text"
                className="form-input"
                value={data.button_link || ''}
                onChange={(e) => onChange({ button_link: e.target.value })}
                placeholder="/register"
              />
            </div>
          </div>
        </div>
      );

    case 'stats':
      const statItems = Array.isArray(data.items) ? data.items : [];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--white-80)' }}>Metrics Counters</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {statItems.map((stat, stIdx) => (
              <div key={stIdx} style={{ background: 'var(--navy-800)', border: '1px solid var(--navy-600)', borderRadius: 10, padding: 10 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Metric Value (e.g. 99.99%)"
                  value={stat.value || ''}
                  onChange={(e) => {
                    const newStats = [...statItems];
                    newStats[stIdx] = { ...stat, value: e.target.value };
                    onChange({ items: newStats });
                  }}
                  style={{ marginBottom: 6, fontWeight: 700 }}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Metric Label (e.g. Uptime SLA)"
                  value={stat.label || ''}
                  onChange={(e) => {
                    const newStats = [...statItems];
                    newStats[stIdx] = { ...stat, label: e.target.value };
                    onChange({ items: newStats });
                  }}
                  style={{ fontSize: 12 }}
                />
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return (
        <div style={{ color: 'var(--white-60)', fontSize: 13 }}>
          Generic block: <code>{JSON.stringify(data)}</code>
        </div>
      );
  }
}
