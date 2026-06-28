import { Link, Navigate } from 'react-router-dom';
import { Activity, ShieldCheck, Zap, Globe2, Database, Code2, BellRing, CheckCircle2, Menu, X, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export default function Landing() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [plans, setPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly'); // monthly, half_yearly, yearly

  useEffect(() => {
    // Fetch plans
    apiClient.get('/plans')
      .then(res => setPlans(res.data))
      .catch(err => console.error("Failed to load plans", err));

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
  }, []);

  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  return (
    <div className="landing-page relative overflow-x-hidden">
      {/* Background Pulse */}
      <div className="hero-pulse-bg"></div>

      {/* Navigation */}
      <header className="fixed w-full top-0 z-50 p-0 lg:pt-4 lg:px-6">
        <nav className="ur-nav-glass flex items-center justify-between lg:border lg:rounded-xl max-w-7xl mx-auto px-4 py-4 lg:px-6 lg:py-3">
          
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Activity className="w-8 h-8 text-ur-primary" />
              <span className="text-xl font-bold tracking-tight">NetOps Monitor</span>
            </div>

            <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-ur-text-muted">
              <a href="#about" className="hover:text-white transition-colors">About Us</a>
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#solutions" className="hover:text-white transition-colors">Solutions</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <Link to="/login" className="btn-ur-ghost text-sm">
              Log in
            </Link>
            <Link to="/register" className="btn-ur-primary text-sm">
              Get started free
            </Link>
          </div>

          <div className="lg:hidden flex items-center gap-3">
            <Link to="/register" className="btn-ur-primary text-sm px-3 py-1.5">
              Start Free
            </Link>
            <button className="text-white p-1" onClick={toggleMobileMenu}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-ur-bg pt-24 px-6 flex flex-col gap-6 lg:hidden">
          <a href="#features" className="text-lg font-medium text-white" onClick={toggleMobileMenu}>Features</a>
          <a href="#solutions" className="text-lg font-medium text-white" onClick={toggleMobileMenu}>Solutions</a>
          <a href="#pricing" className="text-lg font-medium text-white" onClick={toggleMobileMenu}>Pricing</a>
          <hr className="border-ur-border" />
          <Link to="/login" className="text-lg font-medium text-white" onClick={toggleMobileMenu}>Log in</Link>
          <Link to="/register" className="btn-ur-primary text-center mt-2" onClick={toggleMobileMenu}>Get started free</Link>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 lg:pt-52 lg:pb-32 px-6">
        <div className="max-w-4xl mx-auto text-center z-10 relative">
          
          <div className="inline-flex items-center gap-2 mb-8 bg-[#131b25cc] border border-[#2d3540] rounded-full py-2 px-4 shadow-lg">
            <div className="w-2 h-2 rounded-full bg-ur-primary animate-pulse"></div>
            <span className="text-sm font-light text-white">Join 100,000+ users who trust NetOps</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-white ur-tracking-tight leading-tight mb-8">
            Downtime happens.<br />
            <span className="text-gradient-ur">Get alerted instantly.</span>
          </h1>

          <ul className="flex justify-center flex-wrap mb-10 gap-4 sm:gap-6">
            <li className="flex items-center gap-2 text-ur-text-muted font-light sm:text-lg">
              <CheckCircle2 className="text-ur-primary w-6 h-6" />
              <span>Unlimited basic monitors</span>
            </li>
            <li className="flex items-center gap-2 text-ur-text-muted font-light sm:text-lg">
              <CheckCircle2 className="text-ur-primary w-6 h-6" />
              <span>Instant email & SMS alerts</span>
            </li>
            <li className="flex items-center gap-2 text-ur-text-muted font-light sm:text-lg">
              <CheckCircle2 className="text-ur-primary w-6 h-6" />
              <span>Beautiful status pages</span>
            </li>
          </ul>

          <div className="flex items-center justify-center">
            <Link to="/register" className="btn-ur-primary text-lg px-8 py-4 flex items-center gap-2">
              Start monitoring in 30 seconds
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-ur-bg relative z-10 border-t border-ur-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-20 mb-16">
            <div>
              <h2 className="text-3xl sm:text-4xl font-semibold text-white ur-tracking-tight leading-tight max-w-sm">
                Catch downtime before your users do<span className="text-ur-primary">.</span>
              </h2>
            </div>
            <div className="flex items-center lg:justify-end">
              <p className="max-w-lg text-ur-text-muted font-light leading-relaxed">
                Monitor uptime, APIs, databases, and SSL certificates in real time. Set up monitors in minutes, get instant alerts when something breaks, and integrate with your existing workflow effortlessly.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* API Monitoring */}
            <Link to="/register" className="ur-card p-6 pt-0 block group">
              <div className="mb-6 flex justify-center mt-6">
                <div className="ur-card-icon-container">
                  <Code2 className="w-6 h-6 text-ur-primary" />
                </div>
              </div>
              <div className="flex justify-between items-end gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">API monitoring</h3>
                  <p className="text-sm text-ur-text-muted font-light leading-relaxed">
                    Check API endpoints, parse JSON responses, and validate status codes.
                  </p>
                </div>
              </div>
            </Link>

            {/* Ping Monitoring */}
            <Link to="/register" className="ur-card p-6 pt-0 block group">
              <div className="mb-6 flex justify-center mt-6">
                <div className="ur-card-icon-container">
                  <Activity className="w-6 h-6 text-ur-primary" />
                </div>
              </div>
              <div className="flex justify-between items-end gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Ping monitoring</h3>
                  <p className="text-sm text-ur-text-muted font-light leading-relaxed">
                    Make sure your server or any device in the network is always online.
                  </p>
                </div>
              </div>
            </Link>

            {/* SSL Monitoring */}
            <Link to="/register" className="ur-card p-6 pt-0 block group">
              <div className="mb-6 flex justify-center mt-6">
                <div className="ur-card-icon-container">
                  <ShieldCheck className="w-6 h-6 text-ur-primary" />
                </div>
              </div>
              <div className="flex justify-between items-end gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">SSL monitoring</h3>
                  <p className="text-sm text-ur-text-muted font-light leading-relaxed">
                    Get alerted 30, 14, and 7 days before your SSL certificates expire.
                  </p>
                </div>
              </div>
            </Link>

            {/* Database Monitoring */}
            <Link to="/register" className="ur-card p-6 pt-0 block group">
              <div className="mb-6 flex justify-center mt-6">
                <div className="ur-card-icon-container">
                  <Database className="w-6 h-6 text-ur-primary" />
                </div>
              </div>
              <div className="flex justify-between items-end gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Database monitoring</h3>
                  <p className="text-sm text-ur-text-muted font-light leading-relaxed">
                    Track database health, connection latency, and query performance.
                  </p>
                </div>
              </div>
            </Link>

            {/* Global Locations */}
            <Link to="/register" className="ur-card p-6 pt-0 block group">
              <div className="mb-6 flex justify-center mt-6">
                <div className="ur-card-icon-container">
                  <Globe2 className="w-6 h-6 text-ur-primary" />
                </div>
              </div>
              <div className="flex justify-between items-end gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Global locations</h3>
                  <p className="text-sm text-ur-text-muted font-light leading-relaxed">
                    Verify availability from multiple geographic regions worldwide.
                  </p>
                </div>
              </div>
            </Link>

            {/* Custom Alerts */}
            <Link to="/register" className="ur-card p-6 pt-0 block group">
              <div className="mb-6 flex justify-center mt-6">
                <div className="ur-card-icon-container">
                  <BellRing className="w-6 h-6 text-ur-primary" />
                </div>
              </div>
              <div className="flex justify-between items-end gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Custom alerts</h3>
                  <p className="text-sm text-ur-text-muted font-light leading-relaxed">
                    Route critical alerts to the right team instantly via Webhooks or Email.
                  </p>
                </div>
              </div>
            </Link>

          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-20 bg-ur-bg relative z-10 border-t border-ur-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold text-white ur-tracking-tight leading-tight mb-6">
            About NetOps Monitor
          </h2>
          <p className="max-w-3xl mx-auto text-ur-text-muted font-light leading-relaxed text-lg mb-8">
            NetOps Monitor was built out of the sheer frustration of complex, bloated, and expensive monitoring tools. We believe that every developer and IT professional deserves a beautiful, intuitive, and lightning-fast platform to keep an eye on their mission-critical infrastructure.
          </p>
          <p className="max-w-3xl mx-auto text-ur-text-muted font-light leading-relaxed text-lg">
            Whether you are managing a single personal project or a global enterprise architecture, NetOps gives you the visibility and real-time alerts you need to sleep soundly at night.
          </p>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-[#0d1218] relative z-10 border-t border-ur-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-semibold text-white ur-tracking-tight leading-tight mb-6">
              Simple, transparent pricing
            </h2>
            <p className="text-ur-text-muted font-light mb-8">Start for free, upgrade when you need more power.</p>

            <div className="inline-flex bg-ur-bg border border-ur-border rounded-full p-1">
              <button 
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'bg-ur-primary text-[#000]' : 'text-ur-text-muted hover:text-white'}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setBillingCycle('half_yearly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${billingCycle === 'half_yearly' ? 'bg-ur-primary text-[#000]' : 'text-ur-text-muted hover:text-white'}`}
              >
                Half Yearly
              </button>
              <button 
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${billingCycle === 'yearly' ? 'bg-ur-primary text-[#000]' : 'text-ur-text-muted hover:text-white'}`}
              >
                Yearly
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.length > 0 ? plans.map((plan, idx) => {
              let price = plan.price_inr_monthly;
              let period = 'mo';
              if (billingCycle === 'half_yearly') {
                price = plan.price_inr_half_yearly || (plan.price_inr_monthly * 6);
                period = '6 mo';
              } else if (billingCycle === 'yearly') {
                price = plan.price_inr_yearly || (plan.price_inr_monthly * 12);
                period = 'yr';
              }

              const isPopular = idx === 1; // Highlight the middle one

              return (
                <div key={plan.id || idx} className={`ur-card p-8 flex flex-col ${isPopular ? 'border border-ur-primary relative shadow-[0_0_30px_rgba(59,214,113,0.15)]' : ''}`}>
                  {isPopular && <div className="absolute top-0 right-8 transform -translate-y-1/2 bg-ur-primary text-[#000] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Most Popular</div>}
                  <h3 className="text-2xl font-semibold text-white mb-2">{plan.name}</h3>
                  <p className="text-ur-text-muted font-light mb-6">{plan.description || 'Great for your needs'}</p>
                  <div className="text-4xl font-bold text-white mb-8">₹{price}<span className="text-lg text-ur-text-muted font-light"> / {period}</span></div>
                  <ul className="mb-8 flex-1 space-y-4">
                    <li className="flex items-center gap-3 text-sm text-white"><CheckCircle2 className="w-5 h-5 text-ur-primary" /> {plan.monitor_limit} Monitors</li>
                    <li className="flex items-center gap-3 text-sm text-white"><CheckCircle2 className="w-5 h-5 text-ur-primary" /> {plan.check_interval_min_seconds}s intervals</li>
                    <li className="flex items-center gap-3 text-sm text-white"><CheckCircle2 className="w-5 h-5 text-ur-primary" /> {plan.status_page_limit} Status Pages</li>
                    {plan.features && Array.isArray(plan.features) && plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-white"><CheckCircle2 className="w-5 h-5 text-ur-primary" /> {feature}</li>
                    ))}
                  </ul>
                  <Link to="/register" className={`w-full py-3 text-center ${isPopular ? 'btn-ur-primary' : 'btn-ur-ghost'}`}>{price === 0 ? 'Start Free' : 'Get ' + plan.name}</Link>
                </div>
              );
            }) : (
              <div className="col-span-3 text-center text-ur-text-muted py-10">Loading plans...</div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-ur-bg border-t border-ur-border py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-ur-primary" />
              <span className="text-2xl font-bold tracking-tight text-white">NetOps Monitor</span>
            </div>
            <div className="flex gap-6 text-sm text-ur-text-muted font-light">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#about" className="hover:text-white transition-colors">About Us</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            </div>
          </div>
          
          <div className="border-t border-ur-border pt-8 flex flex-col lg:flex-row justify-between items-center gap-6">
            <p className="text-ur-text-muted font-light text-sm text-center lg:text-left">
              &copy; {new Date().getFullYear()} NetOps Monitor. All rights reserved.
            </p>
            <div className="text-ur-text-muted font-light text-sm text-center lg:text-right leading-relaxed">
              <p>This tool is Provided By <span className="text-white font-medium">Infiniforge Technologies</span></p>
              <p>Developed by <span className="text-white font-medium">Abhishek Addepalli</span></p>
              <p>Support WhatsApp Number: <span className="text-ur-primary font-medium">8121886213</span></p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
