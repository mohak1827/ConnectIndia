import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard.api';
import {
  Shield, CheckCircle2, AlertTriangle, Clock, ArrowRight,
  Building2, FileCheck2, Lock, Globe, Database,
  ChevronDown, Users, BarChart3, Zap, Eye, Key,
  FileText, Briefcase, Heart, Star
} from 'lucide-react';

// Animated counter
function AnimatedNumber({ target, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <span>{count.toLocaleString('en-IN')}{suffix}</span>;
}

// Mock dashboard preview stat
function MockStat({ label, value, status, color }) {
  const colors = {
    green: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#22c55e' },
    amber: { bg: '#fffbeb', text: '#92400e', border: '#fde68a', dot: '#f59e0b' },
    blue: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe', dot: '#3b82f6' },
    red: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', dot: '#ef4444' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{label}</span>
        <span style={{ width: 8, height: 8, background: c.dot, borderRadius: '50%', display: 'inline-block' }} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: c.text }}>{value}</div>
      <div style={{ fontSize: 11, color: c.text, marginTop: 2 }}>{status}</div>
    </div>
  );
}

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [publicStats, setPublicStats] = useState(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);

    dashboardApi.getPublicStats()
      .then((res) => {
        if (res.success && res.data) {
          setPublicStats(res.data);
        }
      })
      .catch((err) => console.warn('Could not load public stats:', err.message));

    return () => window.removeEventListener('scroll', handler);
  }, []);

  const services = [
    {
      icon: Heart,
      title: 'Insurance Policy Verification',
      desc: 'Verify policy status, coverage dates, and premium records across insurance providers through a single standardized interface.',
      badge: 'Health · Life · Motor · Travel',
      color: '#1e3a5f',
    },
    {
      icon: FileText,
      title: 'Identity Document Verification',
      desc: 'Check fictional document references against the mock identity registry. Demonstrates secure document validation workflows.',
      badge: 'Prototype — Not Real IDs',
      color: '#0f4c81',
    },
    {
      icon: Briefcase,
      title: 'Employment Record Verification',
      desc: 'Verify employment history, current status, designations, and joining dates against the mock HR registry.',
      badge: 'Employment · HR Records',
      color: '#1a3a6b',
    },
    {
      icon: Building2,
      title: 'Business Registration Verification',
      desc: 'Check business registration status, type, and director information from the fictional business registry.',
      badge: 'Pvt Ltd · LLP · Sole Prop',
      color: '#0d3b6b',
    },
  ];

  const howItWorks = [
    { step: '01', title: 'Select Service', desc: 'Choose from insurance, identity, employment, or business verification services.' },
    { step: '02', title: 'Authenticate', desc: 'Log in with your approved organization credentials. Role-based access is enforced.' },
    { step: '03', title: 'Obtain Authorization', desc: 'Confirm consent requirements are satisfied. The platform evaluates policy before proceeding.' },
    { step: '04', title: 'Submit Request', desc: 'Enter the required reference details. The platform routes the request to the correct provider adapter.' },
    { step: '05', title: 'Receive Result', desc: 'Get a standardized verification result: Verified, Mismatch, Not Found, Expired, or Unavailable.' },
    { step: '06', title: 'Transaction Recorded', desc: 'Every attempt is logged as an immutable audit transaction with timestamp and actor details.' },
  ];

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: '#0f172a', background: '#fff', minHeight: '100vh' }}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: scrolled ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: scrolled ? '1px solid #e2e8f0' : '1px solid transparent',
        transition: 'all 0.3s',
        boxShadow: scrolled ? '0 1px 8px rgba(0,0,0,0.06)' : 'none',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="ConnectIndia Logo" style={{ height: 64, width: 'auto', objectFit: 'contain', cursor: 'pointer' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[
              { label: 'Home', href: '#home' },
              { label: 'How It Works', href: '#how-it-works' },
              { label: 'Services', href: '#services' },
              { label: 'Security', href: '#security' },
              { label: 'About', href: '#about' },
            ].map((link) => (
              <a key={link.label} href={link.href} style={{ padding: '6px 12px', fontSize: 13, fontWeight: 500, color: '#475569', textDecoration: 'none', borderRadius: 8, transition: 'all 0.2s' }}
                onMouseEnter={e => { e.target.style.background = '#f1f5f9'; e.target.style.color = '#0f172a'; }}
                onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#475569'; }}>
                {link.label}
              </a>
            ))}
            <Link to="/login" style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, color: '#1e3a5f', background: '#f0f4ff', border: '1px solid #bfdbfe', borderRadius: 8, textDecoration: 'none', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f0f4ff'; }}>
              Login
            </Link>
            <Link to="/request-access" style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', borderRadius: 8, textDecoration: 'none', boxShadow: '0 2px 8px rgba(37,99,235,0.3)', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,99,235,0.4)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.3)'; e.currentTarget.style.transform = 'none'; }}>
              Request Access
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section id="home" style={{ background: 'linear-gradient(160deg, #0a1628 0%, #1e3a5f 40%, #1e40af 100%)', minHeight: '90vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 24px', position: 'relative', overflow: 'hidden' }}>
        {/* Background grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '20%', right: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '5%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 100, padding: '6px 14px', marginBottom: 24 }}>
                <span style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>Prototype · Fictional Data Only · Not Live APIs</span>
              </div>
              <h1 style={{ fontSize: 52, fontWeight: 800, color: '#fff', lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 20 }}>
                Trust Every Record.<br />
                <span style={{ background: 'linear-gradient(90deg, #60a5fa, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Verify Every Credential.
                </span>
              </h1>
              <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: 36, maxWidth: 480 }}>
                ConnectIndia brings verification workflows together in one secure platform, helping authorized organizations check records, manage access, and track verification activity.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: '#fff', color: '#1e3a5f', borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.25)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'; }}>
                  Access Portal <ArrowRight size={16} />
                </Link>
                <Link to="/request-access" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, fontWeight: 600, fontSize: 15, textDecoration: 'none', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}>
                  Register Your Organization
                </Link>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 32, marginTop: 48, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                {[
                  { label: 'Verification Services', value: publicStats?.servicesCount ?? 5, suffix: '' },
                  { label: 'Sample Records', value: publicStats?.registryRecordsCount ?? 25, suffix: '+' },
                  { label: 'Authoritative Providers', value: publicStats?.providersCount ?? 4, suffix: '' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>
                      <AnimatedNumber target={stat.value} suffix={stat.suffix} />
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard Preview */}
            <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BarChart3 size={14} color="#94a3b8" />
                  </div>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>Verification Dashboard</span>
                </div>
                <span style={{ fontSize: 11, color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', padding: '3px 8px', borderRadius: 100 }}>● DEMO PREVIEW</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <MockStat label="Verified" value="1,284" status="↑ 12% this week" color="green" />
                <MockStat label="Mismatches" value="47" status="Within normal range" color="amber" />
                <MockStat label="Total Requests" value="1,391" status="Last 30 days" color="blue" />
                <MockStat label="Unavailable" value="60" status="Provider timeouts" color="red" />
              </div>
              {/* Recent transactions preview */}
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Recent Transactions</div>
                {[
                  { id: 'REQ-2026-8812', service: 'Insurance Policy', status: 'VERIFIED', ms: '94ms', color: '#22c55e' },
                  { id: 'REQ-2026-8811', service: 'Employment Record', status: 'MISMATCH', ms: '112ms', color: '#f59e0b' },
                  { id: 'REQ-2026-8810', service: 'Identity Document', status: 'VERIFIED', ms: '88ms', color: '#22c55e' },
                  { id: 'REQ-2026-8809', service: 'Business Reg.', status: 'NOT FOUND', ms: '76ms', color: '#64748b' },
                ].map((tx) => (
                  <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8' }}>{tx.id}</div>
                      <div style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 500 }}>{tx.service}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: tx.color }}>{tx.status}</div>
                      <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>{tx.ms}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 10, color: '#64748b', textAlign: 'center' }}>
                ℹ️ Illustrative statistics — not live data
              </div>
            </div>
          </div>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      </section>

      {/* ── THE PROBLEM ── */}
      <section style={{ background: '#f8fafc', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', background: '#fef3c7', color: '#92400e', borderRadius: 100, padding: '4px 16px', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>The Challenge</div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>Why Document Verification Is Broken</h2>
            <p style={{ fontSize: 16, color: '#64748b', maxWidth: 600, margin: '12px auto 0' }}>Organizations spend enormous resources verifying documents that could be fraudulent, altered, or simply misrepresented.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {[
              { icon: '🔍', title: 'Manual Verification', desc: 'Staff manually call or email issuers to verify credentials, wasting time and introducing human error.' },
              { icon: '⚠️', title: 'Document Fraud', desc: 'Altered certificates, fake stamps, and forged records are increasingly difficult to detect visually.' },
              { icon: '🗂️', title: 'Fragmented Data', desc: 'Records are scattered across government portals, HR systems, and insurance databases with no unified access.' },
              { icon: '⏳', title: 'Slow Processes', desc: 'Verification can take days or weeks, delaying admissions, employment, and insurance claims decisions.' },
            ].map((item) => (
              <div key={item.title} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{item.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OUR SOLUTION ── */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-block', background: '#dbeafe', color: '#1e40af', borderRadius: 100, padding: '4px 16px', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Our Solution</div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: 16 }}>One Platform. Multiple Sources. Trusted Verification.</h2>
            <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.7, marginBottom: 24 }}>
              ConnectIndia coordinates verification through authorized sources using a standardized API layer. Authorized organizations submit requests through a single interface while provider-specific integrations remain isolated behind adapters.
            </p>
            {[
              'Modular provider adapter architecture',
              'Role-based access and organization isolation',
              'Consent and authorization enforcement',
              'Immutable audit trail for every request',
              'Standardized results across all services',
            ].map((point) => (
              <div key={point} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <CheckCircle2 size={16} color="#22c55e" />
                <span style={{ fontSize: 14, color: '#374151' }}>{point}</span>
              </div>
            ))}
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 20, padding: '28px 24px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>SYSTEM ARCHITECTURE</span>
                <span style={{ fontSize: 12, color: '#64748b' }}>Federated Interoperability Flow</span>
              </div>
              <span style={{ fontSize: 10, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                ● 5-Layer Stack
              </span>
            </div>

            {[
              {
                num: '1',
                title: 'User Presentation & Role Portals',
                desc: 'Role-specific consoles for Platform Administrators, Provider Operators, and Organization Verifiers.',
                tag: 'Access Layer',
                tagBg: '#eff6ff',
                tagColor: '#1e40af',
                border: '#bfdbfe'
              },
              {
                num: '2',
                title: 'Security & Policy Gateway',
                desc: 'Token authentication, RBAC authorization, service access grants, purpose limitation, and request validation.',
                tag: 'Gateway & Policy',
                tagBg: '#f0fdf4',
                tagColor: '#15803d',
                border: '#bbf7d0'
              },
              {
                num: '3',
                title: 'Verification Gateway & Provider Adapters',
                desc: 'Standardized routing to Academic, Insurance, Identity, Employment, and Business provider adapters.',
                tag: 'Mock Integrations',
                tagBg: '#fffbeb',
                tagColor: '#b45309',
                border: '#fde68a'
              },
              {
                num: '4',
                title: 'Authoritative Provider Registries',
                desc: 'Authoritative fictional records managed directly by authorized provider operators via CRUD & bulk CSV.',
                tag: 'Registry Store',
                tagBg: '#faf5ff',
                tagColor: '#6b21a8',
                border: '#e9d5ff'
              },
              {
                num: '5',
                title: 'Transactions & Audit Ledger',
                desc: 'Append-only ledger of verification request outcomes, roundtrip latency, subject consents, and security events.',
                tag: 'Compliance & Audit',
                tagBg: '#f8fafc',
                tagColor: '#334155',
                border: '#cbd5e1'
              },
            ].map((layer, i) => (
              <div key={layer.title}>
                <div style={{ background: '#f8fafc', border: `1px solid ${layer.border}`, borderRadius: 12, padding: '12px 14px', transition: 'all 0.15s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: '#1e3a5f', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                        {layer.num}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{layer.title}</span>
                    </div>
                    <span style={{ fontSize: 10, background: layer.tagBg, color: layer.tagColor, padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>
                      {layer.tag}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: '#475569', margin: 0, lineHeight: 1.4, paddingLeft: 28 }}>
                    {layer.desc}
                  </p>
                </div>
                {i < 4 && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', margin: '4px 0', fontSize: 14, lineHeight: 1 }}>
                    ↓
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ background: '#f8fafc', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', background: '#dcfce7', color: '#166534', borderRadius: 100, padding: '4px 16px', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>How It Works</div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>From Request to Verified Result</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {howItWorks.map((step) => (
              <div key={step.step} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24, position: 'relative' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#e2e8f0', fontFamily: 'monospace', marginBottom: 12 }}>{step.step}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>{step.title}</h3>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', background: '#f3e8ff', color: '#7e22ce', borderRadius: 100, padding: '4px 16px', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Verification Services</div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>Four Sectors. One Platform.</h2>
            <p style={{ fontSize: 16, color: '#64748b', maxWidth: 560, margin: '12px auto 0' }}>All services use fictional sample data in this prototype. Real API integrations require provider authorization.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
            {services.map((svc) => {
              const Icon = svc.icon;
              return (
                <div key={svc.title} style={{ border: '1px solid #e2e8f0', borderRadius: 20, padding: 28, transition: 'all 0.2s', cursor: 'default' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}>
                  <div style={{ width: 44, height: 44, background: `${svc.color}15`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Icon size={22} color={svc.color} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>{svc.title}</h3>
                  <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 16 }}>{svc.desc}</p>
                  <div style={{ display: 'inline-block', background: '#f1f5f9', color: '#475569', borderRadius: 100, padding: '4px 12px', fontSize: 11, fontWeight: 500 }}>{svc.badge}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECURITY ── */}
      <section id="security" style={{ background: 'linear-gradient(135deg, #0a1628, #1e3a5f)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', color: '#93c5fd', borderRadius: 100, padding: '4px 16px', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Security & Privacy</div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>Built for Trust at Every Layer</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { icon: Lock, title: 'Role-Based Access Control', desc: 'Every API call is authenticated and authorized. Roles determine permitted services and data scope.' },
              { icon: Database, title: 'Organization Isolation', desc: 'Each organization sees only its own transactions. Backend-enforced — never trusts client-supplied IDs.' },
              { icon: Eye, title: 'Consent Enforcement', desc: 'Policy engine evaluates consent and purpose before any provider adapter is called.' },
              { icon: FileText, title: 'Immutable Audit Logs', desc: 'Every action, authentication event, and verification is recorded in an append-only audit trail.' },
              { icon: Key, title: 'Secure Credentials', desc: 'Passwords hashed with bcrypt. JWT tokens for session management. Secrets in environment variables only.' },
              { icon: Shield, title: 'Prototype Disclaimer', desc: 'All results carry explicit prototype labels. Mock results are never presented as official verifications.' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24 }}>
                  <div style={{ width: 40, height: 40, background: 'rgba(59,130,246,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Icon size={18} color="#60a5fa" />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{item.title}</h3>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FUTURE INTEGRATIONS ── */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#fef3c7', color: '#92400e', borderRadius: 100, padding: '4px 16px', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Future Integrations</div>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: 16 }}>Designed for Real-World Integration</h2>
          <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.7, maxWidth: 680, margin: '0 auto 40px' }}>
            The provider adapter architecture means real external APIs can be added without changing the verification workflow, consent logic, or audit system. Each provider requires its own authentication, request mapping, response normalization, and consent flow.
          </p>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 20, padding: 32, textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>To integrate a real provider, implement:</div>
            {[
              '1. Provider-specific authentication (OAuth, API key, mTLS, etc.)',
              '2. Request field mapping from standard format to provider format',
              '3. Response mapping from provider format to standard result',
              '4. Provider-specific consent and authorization requirements',
              '5. Timeout, retry, and error handling policies',
              '6. Secure credential storage in environment variables',
            ].map((step) => (
              <div key={step} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <CheckCircle2 size={15} color="#22c55e" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 14, color: '#374151' }}>{step}</span>
              </div>
            ))}
            <div style={{ marginTop: 20, padding: '12px 16px', background: '#fef3c7', borderRadius: 10, fontSize: 13, color: '#92400e' }}>
              ⚠️ <strong>Never call a real provider</strong> without documented API access, valid credentials, and explicit authorization from the data custodian.
            </div>
          </div>
        </div>
      </section>

      {/* ── ORGANIZATION ACCESS ── */}
      <section id="about" style={{ background: '#f8fafc', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-block', background: '#dbeafe', color: '#1e40af', borderRadius: 100, padding: '4px 16px', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Organization Access</div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: 16 }}>Approval-Based Onboarding</h2>
            <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.7, marginBottom: 24 }}>
              ConnectIndia does not offer open public signup. Organizations must submit a request explaining their verification needs. An administrator reviews, approves, and activates the account.
            </p>
            {[
              { step: '1', text: 'Submit organization access request' },
              { step: '2', text: 'Administrator reviews and approves' },
              { step: '3', text: 'Account activated with assigned services' },
              { step: '4', text: 'Organization logs in and starts verifying' },
            ].map((item) => (
              <div key={item.step} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, background: '#1e3a5f', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{item.step}</div>
                <span style={{ fontSize: 15, color: '#374151' }}>{item.text}</span>
              </div>
            ))}
            <Link to="/request-access" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 24, padding: '12px 24px', background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: '#fff', borderRadius: 12, fontWeight: 600, fontSize: 14, textDecoration: 'none', boxShadow: '0 4px 14px rgba(30,58,95,0.3)' }}>
              Request Organization Access <ArrowRight size={15} />
            </Link>
          </div>
          <div>
            {[
              { type: 'Insurance Company', desc: 'Policy verification and claims processing' },
              { type: 'University or College', desc: 'Academic credential and admission verification' },
              { type: 'Employer', desc: 'Employment history and background checks' },
              { type: 'Hospital / Healthcare', desc: 'Identity verification for patient onboarding' },
              { type: 'Government Agency', desc: 'Multi-sector verification for public services' },
              { type: 'Business / Professional', desc: 'Compliance and due diligence verification' },
            ].map((org) => (
              <div key={org.type} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #e2e8f0' }}>
                <Building2 size={18} color="#64748b" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{org.type}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{org.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#0a1628', color: 'rgba(255,255,255,0.6)', padding: '48px 24px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 40, paddingBottom: 40, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <img src="/logo.png" alt="ConnectIndia Logo" style={{ height: 56, width: 'auto', objectFit: 'contain' }} />
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 280 }}>
                A secure multi-sector verification and API interoperability prototype. All data is fictional and for demonstration purposes only.
              </p>
            </div>
            {[
              { title: 'Platform', links: ['Home', 'How It Works', 'Services', 'Security'] },
              { title: 'Organization', links: ['Request Access', 'Login', 'Admin Portal', 'API Docs'] },
              { title: 'Legal', links: ['Privacy Policy', 'Terms of Use', 'Disclaimer', 'Contact'] },
            ].map((col) => (
              <div key={col.title}>
                <div style={{ fontWeight: 600, color: '#fff', fontSize: 13, marginBottom: 14 }}>{col.title}</div>
                {col.links.map((link) => (
                  <div key={link} style={{ marginBottom: 8 }}>
                    <a href="#" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.2s' }}
                      onMouseEnter={e => { e.target.style.color = '#fff'; }}
                      onMouseLeave={e => { e.target.style.color = 'rgba(255,255,255,0.5)'; }}>
                      {link}
                    </a>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>© 2026 ConnectIndia Prototype · College Evaluation Edition · Not affiliated with any government entity</div>
            <div style={{ padding: '6px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 100, fontSize: 11, color: '#fca5a5', fontWeight: 500 }}>
              ⚠️ PROTOTYPE — ALL DATA IS FICTIONAL
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
