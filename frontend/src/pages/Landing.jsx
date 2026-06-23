import { Link, Navigate } from 'react-router-dom';
import { Activity, ShieldCheck, Zap, Globe2, BarChart3, ArrowRight, CheckCircle2, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const [plans, setPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly', 'yearly'
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    apiClient.get('/plans').then(({ data }) => setPlans(data)).catch(() => {});
  }, []);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Helper to determine price based on cycle
  const getPrice = (plan) => {
    if (billingCycle === 'yearly') return plan.price_inr_yearly || (plan.price_inr_monthly * 10); // 2 months free as fallback
    if (billingCycle === 'half_yearly') return plan.price_inr_half_yearly || (plan.price_inr_monthly * 5.5);
    return plan.price_inr_monthly;
  };

  return (
    <div className="landing-page">
      <div style={{ position: 'sticky', top: 20, zIndex: 1000, padding: '0 24px' }}>
        <nav className="landing-nav glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', maxWidth: '1000px', margin: '0 auto', borderRadius: '100px', background: 'rgba(11, 25, 41, 0.7)' }}>
          <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="brand-mark" style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, var(--saffron-500) 0%, var(--saffron-500) 33%, var(--white-100) 33%, var(--white-100) 66%, var(--green-500) 66%)' }} />
            <div className="brand-name" style={{ fontSize: 20, letterSpacing: '-0.5px', fontWeight: 800 }}>{window.APP_NAME || 'NetOps Monitor'}</div>
          </div>
          <div className="nav-links" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link to="/login" className="btn btn-ghost" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>Log in</Link>
            <Link to="/register" className="btn btn-primary" style={{ padding: '10px 24px', borderRadius: '100px' }}>Start for free</Link>
          </div>
          <button className="mobile-toggle" onClick={() => setIsMobileMenuOpen(true)}><Menu size={28} /></button>
        </nav>
      </div>

      {isMobileMenuOpen && (
        <div className="mobile-menu-overlay">
          <button className="mobile-toggle" style={{ position: "absolute", top: 24, right: 48, display: "block" }} onClick={() => setIsMobileMenuOpen(false)}><X size={32} /></button>
          <Link to="/login" className="btn btn-ghost" style={{ fontSize: 24 }} onClick={() => setIsMobileMenuOpen(false)}>Log in</Link>
          <Link to="/register" className="btn btn-primary" style={{ fontSize: 24, padding: "16px 32px" }} onClick={() => setIsMobileMenuOpen(false)}>Start for free</Link>
        </div>
      )}

      <header className="hero" style={{ textAlign: 'center', padding: '160px 24px 100px', maxWidth: '900px', margin: '0 auto', position: 'relative' }}>
        <div className="hero-glow"></div>
        <div className="mesh-bg"></div>
        <div className="hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--navy-800)', border: '1px solid var(--navy-border)', borderRadius: '30px', fontSize: 13, fontWeight: 600, marginBottom: 32 }}>
          <span className="live-dot" style={{ width: 8, height: 8, background: 'var(--green-400)', borderRadius: '50%', boxShadow: '0 0 10px var(--green-400)' }}></span>
          Trusted by 10,000+ DevOps Teams
        </div>
        <h1 className="hero-title" style={{ fontSize: '72px', fontWeight: 900, marginBottom: '24px', lineHeight: 1.05, letterSpacing: '-1.5px' }}>
          Downtime happens.<br/>
          <span className="animated-gradient-text" style={{ paddingBottom: '10px', display: 'inline-block' }}>
            Get alerted instantly.
          </span>
        </h1>
        <p className="hero-subtitle" style={{ fontSize: '20px', maxWidth: '640px', margin: '0 auto 40px', color: 'var(--white-60)', lineHeight: 1.6 }}>
          The world's leading uptime monitoring service. Monitor HTTP, Ping, Port, DNS, and SSL. Get alerts via Slack, SMS, and Webhooks instantly.
        </p>
        <div className="hero-actions" style={{ display: 'flex', gap: 16, justifyItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" className="btn btn-primary btn-lg" style={{ fontSize: '16px', padding: '18px 40px', borderRadius: '100px', fontWeight: 700 }}>
            Start Monitoring Free <ArrowRight size={20} />
          </Link>
          <a href="#pricing" className="btn btn-ghost btn-lg" style={{ fontSize: '16px', padding: '18px 40px', borderRadius: '100px', fontWeight: 700, border: '1px solid var(--navy-border)', background: 'var(--navy-800)' }}>
            View Pricing
          </a>
        </div>
        <p style={{ marginTop: 20, fontSize: 13, color: 'var(--white-40)' }}>No credit card required · 50 monitors free forever</p>
      </header>

      <section className="features" id="features" style={{ padding: '100px 24px', background: 'var(--navy-900)', borderTop: '1px solid var(--navy-border)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 className="section-title" style={{ fontSize: '42px', fontWeight: 800, textAlign: 'center', marginBottom: '64px' }}>
            Everything you need to monitor uptime.
          </h2>
          <div className="feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '32px' }}>
            <FeatureCard 
              icon={Globe2} 
              title="Global Uptime Checks" 
              desc="We verify your downtime from multiple global locations to prevent false positives before alerting you." 
            />
            <FeatureCard 
              icon={Zap} 
              title="30-Second Checks" 
              desc="Time is money. Our monitors check your services every 30 seconds so you're always the first to know." 
            />
            <FeatureCard 
              icon={ShieldCheck} 
              title="SSL Expiry Tracking" 
              desc="Never let a certificate expire again. We monitor validity, issuer changes, and chain health 24/7." 
            />
            <FeatureCard 
              icon={Activity} 
              title="Cron / Heartbeat" 
              desc="Monitor background jobs, backups, and intranet scripts. If they don't ping us, we ping you." 
            />
            <FeatureCard 
              icon={BarChart3} 
              title="Public Status Pages" 
              desc="Build trust with your customers. Share a beautiful, zero-maintenance status page on your own domain." 
            />
            <FeatureCard 
              icon={CheckCircle2} 
              title="Multi-Channel Alerts" 
              desc="Receive instant notifications via Email, SMS, Slack, Discord, Microsoft Teams, and Webhooks." 
            />
          </div>
        </div>
      </section>

      <section className="pricing" id="pricing" style={{ padding: '120px 24px', background: 'var(--navy-950)', borderTop: '1px solid var(--navy-border)' }}>
        <h2 className="section-title" style={{ fontSize: '48px', fontWeight: 800, textAlign: 'center', marginBottom: '24px' }}>
          Simple, transparent pricing.
        </h2>
        <p style={{ textAlign: 'center', fontSize: 18, color: 'var(--white-60)', marginBottom: 48 }}>
          Start for free, upgrade when you need more power.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 64 }}>
          <div style={{ background: 'var(--navy-900)', border: '1px solid var(--navy-border)', borderRadius: '30px', padding: 6, display: 'inline-flex' }}>
            <button 
              onClick={() => setBillingCycle('monthly')}
              style={{ cursor: 'pointer', background: billingCycle === 'monthly' ? 'var(--chakra-500)' : 'transparent', color: billingCycle === 'monthly' ? '#fff' : 'var(--white-60)', border: 'none', padding: '10px 24px', borderRadius: '24px', fontWeight: 600, fontSize: 15, transition: 'all 0.2s' }}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBillingCycle('yearly')}
              style={{ cursor: 'pointer', background: billingCycle === 'yearly' ? 'var(--chakra-500)' : 'transparent', color: billingCycle === 'yearly' ? '#fff' : 'var(--white-60)', border: 'none', padding: '10px 24px', borderRadius: '24px', fontWeight: 600, fontSize: 15, transition: 'all 0.2s', position: 'relative' }}
            >
              Yearly <span style={{ position: 'absolute', top: -10, right: -15, background: 'var(--green-500)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 800 }}>SAVE 20%</span>
            </button>
          </div>
        </div>

        <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
          {plans.map((plan, i) => {
            const isPopular = plan.key === 'professional' || plan.key === 'pro';
            return (
              <div key={plan.id} className={`pricing-card ${isPopular ? "popular" : ""}`} style={{ 
                background: isPopular ? 'var(--navy-900)' : 'var(--navy-950)', 
                border: isPopular ? '2px solid var(--chakra-500)' : '1px solid var(--navy-border)', 
                padding: '40px 32px', 
                borderRadius: '24px', 
                position: 'relative',
                transform: isPopular ? 'scale(1.03)' : 'none',
                boxShadow: isPopular ? '0 20px 40px rgba(0,0,0,0.4)' : 'none',
                zIndex: isPopular ? 10 : 1
              }}>
                {isPopular && <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'var(--chakra-500)', color: '#fff', fontSize: 12, fontWeight: 800, padding: '6px 16px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: 1 }}>Most Popular</div>}
                
                <div className="plan-name" style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, textTransform: 'capitalize' }}>{plan.name}</div>
                <div style={{ fontSize: 14, color: 'var(--white-60)', marginBottom: 24, minHeight: 40 }}>
                  {plan.key === 'free' ? 'For personal hobby projects.' : plan.key.includes('starter') ? 'For small businesses.' : 'For serious professional teams.'}
                </div>
                
                <div className="plan-price" style={{ fontSize: 48, fontWeight: 900, marginBottom: 8, display: 'flex', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 24, fontWeight: 600, color: 'var(--white-60)', marginRight: 4 }}>₹</span>
                  {getPrice(plan)}
                  <span style={{ fontSize: 16, color: 'var(--white-60)', fontWeight: 500, marginLeft: 4 }}>/ {billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                </div>

                <Link to="/register" className={`btn ${isPopular ? 'btn-primary' : 'btn-ghost'}`} style={{ width: '100%', marginBottom: 32, padding: '14px', fontSize: 16, borderRadius: 12 }}>
                  Get Started
                </Link>

                <ul className="plan-features" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <li style={{ display: 'flex', gap: 12, color: 'var(--white-80)', fontSize: 15 }}>
                    <CheckIcon /> <strong>{plan.monitor_limit}</strong> Monitors
                  </li>
                  <li style={{ display: 'flex', gap: 12, color: 'var(--white-80)', fontSize: 15 }}>
                    <CheckIcon /> <strong>{plan.check_interval_min_seconds}s</strong> Checking Interval
                  </li>
                  <li style={{ display: 'flex', gap: 12, color: 'var(--white-80)', fontSize: 15 }}>
                    <CheckIcon /> <strong>{plan.team_member_limit}</strong> Team Members
                  </li>
                  {(plan.features || []).includes('status_pages') ? (
                    <li style={{ display: 'flex', gap: 12, color: 'var(--white-80)', fontSize: 15 }}>
                      <CheckIcon /> Public Status Pages
                    </li>
                  ) : (
                    <li style={{ display: 'flex', gap: 12, color: 'var(--white-40)', fontSize: 15 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 3 }}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      No Status Pages
                    </li>
                  )}
                  {(plan.features || []).includes('api_access') ? (
                    <li style={{ display: 'flex', gap: 12, color: 'var(--white-80)', fontSize: 15 }}>
                      <CheckIcon /> API Access
                    </li>
                  ) : (
                    <li style={{ display: 'flex', gap: 12, color: 'var(--white-40)', fontSize: 15 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 3 }}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      No API Access
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="landing-footer" style={{ padding: '60px 24px', borderTop: '1px solid var(--navy-border)', background: 'var(--navy-950)', textAlign: 'center' }}>
        <div className="brand-mark" style={{ width: 32, height: 32, margin: '0 auto 20px', borderRadius: 10, background: 'linear-gradient(135deg, var(--saffron-500) 0%, var(--saffron-500) 33%, var(--white-100) 33%, var(--white-100) 66%, var(--green-500) 66%)' }} />
        <p style={{ color: 'var(--white-60)', fontSize: 15 }}>© {new Date().getFullYear()} {window.APP_NAME || 'NetOps Monitor'}. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <div className="feature-card" style={{ background: 'var(--navy-950)', border: '1px solid var(--navy-border)', padding: '40px 32px', borderRadius: '20px', transition: 'all 0.3s' }}>
      <div className="feature-icon" style={{ width: 56, height: 56, borderRadius: '16px', background: 'var(--chakra-dim)', color: 'var(--chakra-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
        <Icon size={28} />
      </div>
      <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>{title}</h3>
      <p style={{ color: 'var(--white-60)', fontSize: 16, lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green-400)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}
