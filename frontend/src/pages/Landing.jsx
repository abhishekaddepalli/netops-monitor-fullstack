import { Link, Navigate, useParams } from 'react-router-dom';
import { 
  Activity, ShieldCheck, Zap, Globe2, Database, Code2, BellRing, 
  CheckCircle2, Menu, X, ArrowRight, ChevronRight, ChevronLeft, 
  ChevronDown, Sparkles, Clock, Server, Check, HelpCircle
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { apiClient } from '../api/client';
import PwaInstallButton from '../components/pwa/PwaInstallButton';

export default function Landing() {
  const { slug } = useParams();
  const pageSlug = slug || 'home';

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [plans, setPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly'); // monthly, half_yearly, yearly
  const [pageData, setPageData] = useState(null);
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);

  // Fetch page CMS content and live plans
  useEffect(() => {
    // 1. Fetch live plans for pricing table
    apiClient.get('/plans')
      .then(res => setPlans(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error("Failed to load plans", err));

    // 2. Fetch CMS page blocks
    apiClient.get(`/cms/pages/${pageSlug}`)
      .then(res => {
        if (res.data?.page) {
          setPageData(res.data.page);
        }
      })
      .catch(err => {
        console.warn("CMS page not found or defaulting:", err);
      });

    // 3. Check auth
    const token = localStorage.getItem('token');
    if (token) {
      apiClient.get('/users/me')
        .then(() => setIsAuthenticated(true))
        .catch(() => {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [pageSlug]);

  // Auto-advance slider if present
  useEffect(() => {
    const sliderBlock = pageData?.blocks?.find(b => b.type === 'sliders');
    const slidesCount = sliderBlock?.content?.slides?.length || 0;
    if (slidesCount > 1) {
      const timer = setInterval(() => {
        setActiveSlide(prev => (prev + 1) % slidesCount);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [pageData]);

  if (loading) return null;
  if (isAuthenticated && !slug) return <Navigate to="/dashboard" replace />;

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  // Default fallback blocks if no CMS page loaded
  const defaultBlocks = [
    {
      type: 'heading',
      content: {
        badge: 'Join 100,000+ users who trust NetOps',
        title: 'Downtime happens.',
        highlight: 'Get alerted instantly.',
        subtitle: 'Lightning-fast synthetic monitoring, immediate multi-channel incident alerts, and real-time network topology maps.',
        cta_text: 'Start monitoring in 30 seconds',
        cta_url: '/register',
        secondary_cta_text: 'Live Demo',
        secondary_cta_url: '/login'
      }
    },
    {
      type: 'stats',
      content: {
        stats: [
          { value: '99.99%', label: 'Platform Uptime SLA' },
          { value: '30s', label: 'Fastest Check Rate' },
          { value: '100k+', label: 'Monitored Endpoints' },
          { value: '< 2s', label: 'Immediate Alert Delivery' }
        ]
      }
    },
    {
      type: 'features',
      content: {
        title: 'Catch downtime before your users do',
        subtitle: 'Comprehensive monitoring suite engineered for modern DevOps & Network teams.',
        items: [
          { title: 'HTTP & API Monitoring', description: 'Validate endpoints, assert JSON status codes, latency thresholds, and SSL expirations.' },
          { title: 'ICMP Ping & Traceroute', description: 'Track packet loss, jitter, round-trip latency, and network routes across nodes.' },
          { title: 'SNMP & Mikrotik Dude', description: 'Monitor routers, switches, CPU loads, bandwidth, and Mikrotik network maps.' },
          { title: 'Zero-Lag Alerts', description: 'Instant alerts over Telegram, WhatsApp, Email, Slack, Webhooks, WirePusher & SMS.' },
          { title: 'Visual Network Maps', description: 'Drag-and-drop live interactive topology maps with real-time link status & speeds.' },
          { title: 'Public & Private Status Pages', description: 'Communicate real-time platform health transparently with your customers.' }
        ]
      }
    },
    {
      type: 'pricing',
      content: {
        title: 'Simple, transparent pricing',
        subtitle: 'Start free and scale effortlessly as your infrastructure grows.'
      }
    },
    {
      type: 'faq',
      content: {
        title: 'Frequently Asked Questions',
        subtitle: 'Everything you need to know about NetOps Monitor.',
        items: [
          { q: 'How fast do alerts arrive when a monitor goes down?', a: 'Alerts are dispatched immediately within seconds through our optimized direct dispatcher across WhatsApp, Telegram, Email, Slack, and WirePusher without queue delays.' },
          { q: 'Can I install NetOps Monitor as an app on my phone?', a: 'Yes! NetOps Monitor is a full Progressive Web App (PWA). You can install it on iOS, Android, macOS, or Windows for instant offline access and app notifications.' },
          { q: 'What protocols can I monitor?', a: 'We support HTTP/HTTPS, TCP Port, ICMP Ping, DNS, SSL Certificate, SNMP, and Mikrotik Dude maps.' },
          { q: 'Can I upgrade or downgrade my plan at any time?', a: 'Yes, plans can be upgraded or switched instantly from the Billing section with automated invoice generation.' }
        ]
      }
    },
    {
      type: 'cta',
      content: {
        title: 'Ready to eradicate downtime?',
        subtitle: 'Get up and running in under 2 minutes. No credit card required.',
        button_text: 'Create Free Account',
        button_url: '/register'
      }
    }
  ];

  const blocksToRender = (pageData?.blocks && pageData.blocks.length > 0) ? pageData.blocks : defaultBlocks;

  return (
    <div className="landing-page relative overflow-x-hidden min-h-screen text-slate-100 bg-[#0a0e14]">
      {/* Background Glow */}
      <div className="hero-pulse-bg pointer-events-none"></div>

      {/* Navigation */}
      <header className="fixed w-full top-0 z-50 p-0 lg:pt-3 lg:px-6">
        <nav className="ur-nav-glass flex items-center justify-between lg:border lg:rounded-xl max-w-7xl mx-auto px-4 py-3.5 lg:px-6 lg:py-3" style={{ backdropFilter: 'blur(16px)', background: 'rgba(13, 18, 24, 0.82)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5">
              {window.APP_LOGO ? (
                <img src={window.APP_LOGO} alt="Logo" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain' }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity className="w-5 h-5 text-white" />
                </div>
              )}
              <span className="text-xl font-bold tracking-tight text-white">{window.APP_NAME || 'NetOps Monitor'}</span>
            </Link>

            <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
              <a href="#features" className="hover:text-sky-400 transition-colors">Features</a>
              <a href="#pricing" className="hover:text-sky-400 transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-sky-400 transition-colors">FAQ</a>
              <a href="#about" className="hover:text-sky-400 transition-colors">About</a>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <PwaInstallButton variant="banner" className="btn-ur-ghost text-xs py-1.5 px-3" />
            <Link to="/login" className="btn-ur-ghost text-sm">
              Log in
            </Link>
            <Link to="/register" className="btn-ur-primary text-sm font-semibold">
              Get started free
            </Link>
          </div>

          <div className="lg:hidden flex items-center gap-2">
            <Link to="/register" className="btn-ur-primary text-xs px-3 py-1.5 font-semibold">
              Start Free
            </Link>
            <button className="text-white p-1.5 rounded-lg border border-white/10 hover:bg-white/5" onClick={toggleMobileMenu} aria-label="Toggle Navigation">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#0a0e14]/98 pt-24 px-6 flex flex-col gap-5 lg:hidden backdrop-blur-xl border-b border-white/10">
          <a href="#features" className="text-lg font-medium text-white hover:text-sky-400" onClick={toggleMobileMenu}>Features</a>
          <a href="#pricing" className="text-lg font-medium text-white hover:text-sky-400" onClick={toggleMobileMenu}>Pricing</a>
          <a href="#faq" className="text-lg font-medium text-white hover:text-sky-400" onClick={toggleMobileMenu}>FAQ</a>
          <a href="#about" className="text-lg font-medium text-white hover:text-sky-400" onClick={toggleMobileMenu}>About</a>
          <hr className="border-white/10 my-2" />
          <PwaInstallButton variant="sidebar" />
          <Link to="/login" className="btn-ur-ghost text-center text-base py-2.5" onClick={toggleMobileMenu}>Log in</Link>
          <Link to="/register" className="btn-ur-primary text-center text-base py-3 font-semibold" onClick={toggleMobileMenu}>Get started free</Link>
        </div>
      )}

      {/* Dynamic Content Blocks */}
      <main className="relative z-10 pt-20">
        {blocksToRender.map((block, idx) => {
          switch (block.type) {
            case 'heading': {
              const c = block.content || {};
              return (
                <section key={idx} className="relative pt-24 pb-16 lg:pt-36 lg:pb-28 px-4 sm:px-6">
                  <div className="max-w-4xl mx-auto text-center relative z-10">
                    {c.badge && (
                      <div className="inline-flex items-center gap-2 mb-6 sm:mb-8 bg-[#131b25cc] border border-[#2d3540] rounded-full py-1.5 px-4 shadow-lg text-xs sm:text-sm text-sky-400">
                        <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                        <span>{c.badge}</span>
                      </div>
                    )}

                    <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white tracking-tight leading-tight mb-6">
                      {c.title || 'Downtime happens.'}{' '}
                      {c.highlight && <span className="text-gradient-ur block sm:inline">{c.highlight}</span>}
                    </h1>

                    <p className="max-w-2xl mx-auto text-slate-300 text-base sm:text-lg lg:text-xl font-light leading-relaxed mb-8 sm:mb-10">
                      {c.subtitle || 'Real-time uptime, network telemetry, and instant multi-channel incident dispatch.'}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      {c.cta_text && (
                        <Link to={c.cta_url || '/register'} className="btn-ur-primary w-full sm:w-auto text-base sm:text-lg px-8 py-3.5 flex items-center justify-center gap-2 font-semibold shadow-lg shadow-sky-500/20">
                          {c.cta_text}
                          <ArrowRight className="w-5 h-5" />
                        </Link>
                      )}
                      {c.secondary_cta_text && (
                        <Link to={c.secondary_cta_url || '/login'} className="btn-ur-ghost w-full sm:w-auto text-base sm:text-lg px-8 py-3.5 flex items-center justify-center">
                          {c.secondary_cta_text}
                        </Link>
                      )}
                    </div>
                  </div>
                </section>
              );
            }

            case 'stats': {
              const statsList = block.content?.stats || [];
              if (statsList.length === 0) return null;
              return (
                <section key={idx} className="py-8 sm:py-12 border-y border-white/5 bg-slate-900/40 backdrop-blur-md">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-center">
                      {statsList.map((stat, sIdx) => (
                        <div key={sIdx} className="p-4 sm:p-6 rounded-xl bg-white/[0.02] border border-white/5">
                          <div className="text-2xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-300 mb-1">
                            {stat.value}
                          </div>
                          <div className="text-xs sm:text-sm text-slate-400 font-medium">
                            {stat.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );
            }

            case 'sliders': {
              const slides = block.content?.slides || [];
              if (slides.length === 0) return null;
              const current = slides[activeSlide] || slides[0];

              return (
                <section key={idx} className="py-16 sm:py-20 relative overflow-hidden">
                  <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-6 sm:p-12 shadow-2xl overflow-hidden min-h-[360px] flex flex-col justify-between">
                      {/* Decorative background glow */}
                      <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

                      <div className="relative z-10 max-w-2xl">
                        <span className="text-xs font-bold uppercase tracking-widest text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full inline-block mb-4">
                          Feature Spotlight
                        </span>
                        <h3 className="text-2xl sm:text-4xl font-bold text-white mb-4">
                          {current.title}
                        </h3>
                        <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 font-light">
                          {current.subtitle}
                        </p>
                        {current.link && (
                          <Link to={current.link} className="btn-ur-primary inline-flex items-center gap-2 text-sm font-semibold">
                            Learn more <ArrowRight size={16} />
                          </Link>
                        )}
                      </div>

                      {/* Slider Controls */}
                      <div className="flex items-center justify-between pt-8 border-t border-white/10 mt-8 relative z-10">
                        <div className="flex gap-2">
                          {slides.map((_, sIndex) => (
                            <button
                              key={sIndex}
                              onClick={() => setActiveSlide(sIndex)}
                              className={`h-2 transition-all rounded-full ${sIndex === activeSlide ? 'w-8 bg-sky-400' : 'w-2 bg-white/20'}`}
                              aria-label={`Go to slide ${sIndex + 1}`}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setActiveSlide(prev => (prev === 0 ? slides.length - 1 : prev - 1))}
                            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                            aria-label="Previous Slide"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button
                            onClick={() => setActiveSlide(prev => (prev + 1) % slides.length)}
                            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                            aria-label="Next Slide"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              );
            }

            case 'features': {
              const c = block.content || {};
              const items = c.items || [];
              return (
                <section key={idx} id="features" className="py-20 border-t border-white/5 bg-[#0a0e14]">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                      <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
                        {c.title || 'Everything you need for zero downtime'}
                      </h2>
                      <p className="text-slate-400 font-light text-base sm:text-lg">
                        {c.subtitle || 'Built from the ground up for high-scale network engineers and IT operations.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {items.map((item, fIdx) => (
                        <div key={fIdx} className="ur-card p-6 rounded-xl border border-white/10 hover:border-sky-500/40 transition-all bg-slate-900/40 hover:bg-slate-900/60 flex flex-col justify-between">
                          <div>
                            <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
                              <Sparkles size={20} />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                            <p className="text-sm text-slate-400 leading-relaxed font-light">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );
            }

            case 'pricing': {
              const c = block.content || {};
              return (
                <section key={idx} id="pricing" className="py-20 border-t border-white/5 bg-slate-950/60">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                      <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
                        {c.title || 'Simple, transparent pricing'}
                      </h2>
                      <p className="text-slate-400 font-light mb-8 max-w-xl mx-auto">
                        {c.subtitle || 'All prices stay automatically updated in real-time.'}
                      </p>

                      <div className="inline-flex bg-slate-900 border border-white/10 rounded-full p-1 shadow-inner">
                        <button 
                          onClick={() => setBillingCycle('monthly')}
                          className={`px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'bg-sky-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                        >
                          Monthly
                        </button>
                        <button 
                          onClick={() => setBillingCycle('half_yearly')}
                          className={`px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${billingCycle === 'half_yearly' ? 'bg-sky-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                        >
                          6 Months
                        </button>
                        <button 
                          onClick={() => setBillingCycle('yearly')}
                          className={`px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${billingCycle === 'yearly' ? 'bg-sky-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                        >
                          Yearly <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full ml-1">Save</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                      {plans.length > 0 ? plans.map((plan, pIdx) => {
                        let price = plan.price_inr_monthly;
                        let period = 'mo';
                        if (billingCycle === 'half_yearly') {
                          price = plan.price_inr_half_yearly || (plan.price_inr_monthly * 6);
                          period = '6 mo';
                        } else if (billingCycle === 'yearly') {
                          price = plan.price_inr_yearly || (plan.price_inr_monthly * 12);
                          period = 'yr';
                        }

                        const isPopular = plan.slug === 'pro' || plan.name?.toLowerCase().includes('pro') || pIdx === 1;

                        return (
                          <div 
                            key={plan.id || pIdx} 
                            className={`p-8 rounded-2xl flex flex-col justify-between transition-all ${
                              isPopular 
                                ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-sky-400 shadow-xl shadow-sky-500/10 relative' 
                                : 'bg-slate-900/60 border border-white/10 hover:border-white/20'
                            }`}
                          >
                            {isPopular && (
                              <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow">
                                Most Popular
                              </div>
                            )}

                            <div>
                              <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                              <p className="text-slate-400 text-sm font-light mb-6 min-h-[40px]">{plan.description || 'Reliable uptime monitoring for your services.'}</p>
                              
                              <div className="text-4xl font-extrabold text-white mb-8 flex items-baseline gap-1">
                                ₹{price}
                                <span className="text-sm font-normal text-slate-400"> / {period}</span>
                              </div>

                              <ul className="mb-8 space-y-3.5 text-sm text-slate-300">
                                <li className="flex items-center gap-3">
                                  <Check className="w-4 h-4 text-sky-400 shrink-0" />
                                  <span><strong>{plan.monitor_limit}</strong> Monitors</span>
                                </li>
                                <li className="flex items-center gap-3">
                                  <Check className="w-4 h-4 text-sky-400 shrink-0" />
                                  <span><strong>{plan.check_interval_min_seconds}s</strong> Check Frequency</span>
                                </li>
                                <li className="flex items-center gap-3">
                                  <Check className="w-4 h-4 text-sky-400 shrink-0" />
                                  <span><strong>{plan.status_page_limit}</strong> Status Pages</span>
                                </li>
                                {plan.features && Array.isArray(plan.features) && plan.features.map((feature, fKey) => (
                                  <li key={fKey} className="flex items-center gap-3">
                                    <Check className="w-4 h-4 text-sky-400 shrink-0" />
                                    <span>{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <Link 
                              to="/register" 
                              className={`w-full py-3.5 text-center rounded-xl font-semibold transition-all ${
                                isPopular 
                                  ? 'btn-ur-primary shadow-lg shadow-sky-500/20' 
                                  : 'btn-ur-ghost border border-white/10 hover:bg-white/5'
                              }`}
                            >
                              {price === 0 ? 'Start Free' : `Choose ${plan.name}`}
                            </Link>
                          </div>
                        );
                      }) : (
                        <div className="col-span-3 text-center text-slate-400 py-12">Loading live plans...</div>
                      )}
                    </div>
                  </div>
                </section>
              );
            }

            case 'image': {
              const c = block.content || {};
              if (!c.url) return null;
              return (
                <section key={idx} className="py-12 px-4 sm:px-6">
                  <div className="max-w-5xl mx-auto text-center">
                    <img 
                      src={c.url} 
                      alt={c.caption || 'CMS Visual'} 
                      className="rounded-2xl border border-white/10 shadow-2xl max-w-full h-auto mx-auto object-cover" 
                    />
                    {c.caption && <p className="text-xs sm:text-sm text-slate-400 mt-3">{c.caption}</p>}
                  </div>
                </section>
              );
            }

            case 'text': {
              const c = block.content || {};
              return (
                <section key={idx} id="about" className="py-16 sm:py-20 border-t border-white/5 bg-[#0a0e14]">
                  <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    {c.title && <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">{c.title}</h2>}
                    <div className="text-slate-300 leading-relaxed text-base sm:text-lg font-light space-y-4 whitespace-pre-line text-left sm:text-center">
                      {c.body || 'NetOps Monitor provides mission-critical synthetic monitoring for high-availability IT infrastructures.'}
                    </div>
                  </div>
                </section>
              );
            }

            case 'faq': {
              const c = block.content || {};
              const items = c.items || [];
              return (
                <section key={idx} id="faq" className="py-20 border-t border-white/5 bg-slate-900/30">
                  <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-12">
                      <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
                        {c.title || 'Frequently Asked Questions'}
                      </h2>
                      <p className="text-slate-400 font-light">
                        {c.subtitle || 'Got questions? We have answers.'}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {items.map((faq, fIdx) => {
                        const isOpen = activeFaq === fIdx;
                        return (
                          <div 
                            key={fIdx} 
                            className="rounded-xl border border-white/10 bg-slate-900/60 overflow-hidden transition-all"
                          >
                            <button
                              onClick={() => setActiveFaq(isOpen ? null : fIdx)}
                              className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-white hover:text-sky-400 transition-colors"
                            >
                              <span className="text-base sm:text-lg">{faq.q}</span>
                              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isOpen && (
                              <div className="px-5 pb-5 text-sm sm:text-base text-slate-300 font-light leading-relaxed border-t border-white/5 pt-3">
                                {faq.a}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              );
            }

            case 'cta': {
              const c = block.content || {};
              return (
                <section key={idx} className="py-20 px-4 sm:px-6">
                  <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-r from-sky-900/50 via-slate-900 to-teal-900/50 border border-sky-500/30 p-8 sm:p-14 text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-sky-500/5 pointer-events-none"></div>
                    <div className="relative z-10">
                      <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-4">
                        {c.title || 'Ready to eradicate downtime?'}
                      </h2>
                      <p className="max-w-2xl mx-auto text-slate-300 text-base sm:text-lg font-light mb-8">
                        {c.subtitle || 'Start monitoring your services in under 30 seconds. No credit card required.'}
                      </p>
                      <Link 
                        to={c.button_url || '/register'} 
                        className="btn-ur-primary text-base sm:text-lg px-8 py-4 inline-flex items-center gap-2 font-semibold shadow-lg shadow-sky-500/30"
                      >
                        {c.button_text || 'Create Free Account'}
                        <ArrowRight size={20} />
                      </Link>
                    </div>
                  </div>
                </section>
              );
            }

            default:
              return null;
          }
        })}
      </main>

      {/* Footer */}
      <footer className="bg-[#070a0e] border-t border-white/10 py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
            <div className="flex items-center gap-3">
              {window.APP_LOGO ? (
                <img src={window.APP_LOGO} alt="Logo" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain' }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity className="w-5 h-5 text-white" />
                </div>
              )}
              <span className="text-2xl font-bold tracking-tight text-white">{window.APP_NAME || 'NetOps Monitor'}</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400 font-light">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
              <a href="#about" className="hover:text-white transition-colors">About Us</a>
              <Link to="/login" className="hover:text-white transition-colors">Login</Link>
              <Link to="/register" className="hover:text-white transition-colors">Register</Link>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 flex flex-col lg:flex-row justify-between items-center gap-6">
            <p className="text-slate-400 font-light text-sm text-center lg:text-left">
              &copy; {new Date().getFullYear()} {window.APP_NAME || 'NetOps Monitor'}. All rights reserved.
            </p>
            <div className="text-slate-400 font-light text-xs sm:text-sm text-center lg:text-right leading-relaxed">
              <p>Provided By <span className="text-white font-medium">Infiniforge Technologies</span> &bull; Developed by <span className="text-white font-medium">Abhishek Addepalli</span></p>
              <p>Support WhatsApp: <span className="text-sky-400 font-medium">8121886213</span></p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
