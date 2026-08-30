import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Search, FileText, Image as ImageIcon, MessageSquare, 
  ExternalLink, TrendingUp, CheckCircle2, XCircle, SlidersHorizontal, 
  HelpCircle, RefreshCw, Send, DollarSign, Award, Layers, Download, Trophy
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const BACKEND_URL = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? "http://127.0.0.1:8000" 
  : (import.meta.env.VITE_BACKEND_URL || "https://retail-intel-cbsa.vercel.app");
const BRANDS_LIST = ["Intel", "AMD", "Qualcomm", "Apple"];

function App() {
  const [activeTab, setActiveTab] = useState('summary');
  const [platform, setPlatform] = useState('Newegg');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Dashboard states
  const [summaryData, setSummaryData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  
  // SKU Explorer states
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Banners state
  const [banners, setBanners] = useState([]);
  const [loadingBanners, setLoadingBanners] = useState(false);
  
  // AI Copilot state
  const [chatMessages, setChatMessages] = useState([
    { sender: 'assistant', text: "Hi Aman! I'm your AI Retail Copilot. Ask me any plain language question about pricing, share of shelf, or brand compliance alerts!" }
  ]);
  const [userInput, setUserInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  // Fetch Dashboard Summary & Trends
  useEffect(() => {
    fetchSummaryAndTrends();
  }, []);

  const fetchSummaryAndTrends = async () => {
    setLoadingSummary(true);
    try {
      const sumRes = await fetch(`${BACKEND_URL}/api/dashboard/summary`);
      const sumJson = await sumRes.json();
      setSummaryData(sumJson);
      
      const trendRes = await fetch(`${BACKEND_URL}/api/dashboard/trends`);
      const trendJson = await trendRes.json();
      setTrendData(trendJson);
    } catch (e) {
      console.error("Error loading summary/trends:", e);
    } finally {
      setLoadingSummary(false);
    }
  };

  // Fetch Products for SKU Explorer
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      let url = `${BACKEND_URL}/api/products?platform=${platform}`;
      if (selectedBrand) url += `&brand=${selectedBrand}`;
      if (selectedType) url += `&type=${selectedType}`;
      if (searchQuery) url += `&search=${searchQuery}`;
      
      const res = await fetch(url);
      const json = await res.json();
      setProducts(json);
    } catch (e) {
      console.error("Error loading products:", e);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'sku_explorer') {
      fetchProducts();
    }
  }, [activeTab, platform, selectedBrand, selectedType]);

  // Fetch Banners
  const fetchBanners = async () => {
    setLoadingBanners(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/banners?platform=${platform}`);
      const json = await res.json();
      setBanners(json);
    } catch (e) {
      console.error("Error loading banners:", e);
    } finally {
      setLoadingBanners(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'banners') {
      fetchBanners();
    }
  }, [activeTab, platform]);

  // Handle Product Selection for Modal Details
  const handleViewProductDetails = async (prodId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/products/${prodId}`);
      const json = await res.json();
      setSelectedProduct(json);
    } catch (e) {
      console.error("Error loading product details:", e);
    }
  };

  // Send Chat message to AI Copilot
  const handleSendChatMessage = async () => {
    if (!userInput.trim()) return;
    const userMsg = userInput.trim();
    setUserInput('');
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setSendingChat(true);
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/copilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const json = await res.json();
      setChatMessages(prev => [...prev, { sender: 'assistant', text: json.reply }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { sender: 'assistant', text: "Error connecting to AI Copilot server. Please check if your FastAPI server is active." }]);
    } finally {
      setSendingChat(false);
    }
  };

  // Export current SKU table to CSV
  const handleExportCSV = () => {
    if (products.length === 0) return;
    const headers = ["SKU", "Name", "Type", "Processor", "Price", "Original Price", "On Promo", "Compliance Score"];
    const csvRows = [headers.join(",")];
    
    products.forEach(p => {
      const row = [
        p.sku,
        `"${p.name.replace(/"/g, '""')}"`,
        p.type,
        p.processor,
        p.current_price,
        p.original_price,
        p.on_promo,
        p.compliance_score
      ];
      csvRows.push(row.join(","));
    });
    
    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `retail_intel_sku_export_${platform.replace(" ", "_").toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Colors for charting
  const brandColors = {
    Intel: "#3b82f6",
    AMD: "#f59e0b",
    Qualcomm: "#10b981",
    Apple: "#ec4899"
  };

  // Filter trends by platform
  const filteredTrends = trendData.filter(t => t.platform === platform);
  
  // Format trend data for charting
  const dates = [...new Set(filteredTrends.map(t => t.date))];
  const chartData = dates.map(date => {
    const dataEntry = { date };
    BRANDS_LIST.forEach(brand => {
      const match = filteredTrends.find(t => t.date === date && t.brand === brand);
      if (match) {
        dataEntry[`${brand}_Shelf`] = match.shelf_share;
        dataEntry[`${brand}_Comp`] = match.compliance;
        dataEntry[`${brand}_Price`] = match.avg_price;
      }
    });
    return dataEntry;
  });

  // Calculate Competitiveness Index Leaderboard
  const getLeaderboard = () => {
    if (!summaryData) return [];
    
    return BRANDS_LIST.map(brand => {
      const compliance = summaryData.compliance[platform]?.[brand] || 100.0;
      const shelf = summaryData.share_of_shelf[platform]?.[brand] || 0.0;
      const pricingObj = summaryData.pricing.find(p => p.platform === platform && p.brand === brand);
      const promo = pricingObj ? pricingObj.promo_share : 0.0;
      
      const compIndex = (compliance * 0.4) + (Math.min(shelf * 2.5, 100) * 0.3) + (promo * 0.3);
      return { brand, score: Math.round(compIndex) };
    }).sort((a, b) => b.score - a.score);
  };

  const leaderboard = getLeaderboard();

  return (
    <div className="app-container">
      {/* =================== SIDEBAR =================== */}
      <div className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-brand">
            <Award size={20} style={{ color: '#6366f1' }} /> Bridge AI Intel
          </h2>
          <button className="menu-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <SlidersHorizontal size={22} />
          </button>
        </div>
        
        <div className="nav-links">
          <div className={`nav-link ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => { setActiveTab('summary'); setIsMobileMenuOpen(false); }}>
            <LayoutDashboard size={18} /> Dashboard Summary
          </div>
          <div className={`nav-link ${activeTab === 'sku_explorer' ? 'active' : ''}`} onClick={() => { setActiveTab('sku_explorer'); setIsMobileMenuOpen(false); }}>
            <Search size={18} /> SKU Explorer
          </div>
          <div className={`nav-link ${activeTab === 'banners' ? 'active' : ''}`} onClick={() => { setActiveTab('banners'); setIsMobileMenuOpen(false); }}>
            <ImageIcon size={18} /> Homepage Banners
          </div>
          <div className={`nav-link ${activeTab === 'copilot' ? 'active' : ''}`} onClick={() => { setActiveTab('copilot'); setIsMobileMenuOpen(false); }}>
            <MessageSquare size={18} /> AI Copilot
          </div>
        </div>
        
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
            <span className="text-sm text-muted">Connected to Atlas</span>
          </div>
        </div>
      </div>

      {/* =================== MAIN CONTENT =================== */}
      <div className="layout">
        <div className="container">
          
          {/* Header with Platform Toggle */}
          <div className="header-section">
            <div>
              <span className="header-title-sub">Retail &amp; Positioning Dashboard</span>
              <h1 className="header-title-main">Multi-Brand Comparative Benchmarks</h1>
            </div>
            
            <div className="platform-toggle">
              <button 
                className={`platform-btn ${platform === 'Newegg' ? 'active' : ''}`}
                onClick={() => setPlatform('Newegg')}
              >
                Newegg (US)
              </button>
              <button 
                className={`platform-btn ${platform === 'Mercado Libre' ? 'active' : ''}`}
                onClick={() => setPlatform('Mercado Libre')}
              >
                Mercado Libre (BR)
              </button>
            </div>
          </div>

          {/* =================== TAB 1: DASHBOARD SUMMARY =================== */}
          {activeTab === 'summary' && (
            <div>
              {loadingSummary ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
                  <RefreshCw className="animate-spin" size={40} />
                </div>
              ) : (
                <div>
                  {/* KPI Cards */}
                  <div className="grid-3" style={{ marginBottom: '32px' }}>

                    {/* Compliance KPI */}
                    <div className="glass-card">
                      <div className="kpi-header">
                        <span className="kpi-header-label">Weighted Compliance Score</span>
                        <Award size={20} style={{ color: '#6366f1', flexShrink: 0 }} />
                      </div>
                      <div className="kpi-list">
                        {summaryData?.compliance?.[platform] && 
                          Object.entries(summaryData.compliance[platform]).map(([brand, score]) => (
                            <div key={brand} className="kpi-row">
                              <span className="kpi-label">{brand}</span>
                              <span className="kpi-value" style={{ color: score > 95 ? '#10b981' : '#f59e0b' }}>{score}%</span>
                            </div>
                          ))
                        }
                      </div>
                    </div>

                    {/* Shelf Share KPI */}
                    <div className="glass-card">
                      <div className="kpi-header">
                        <span className="kpi-header-label">Share of Shelf</span>
                        <Layers size={20} style={{ color: '#3b82f6', flexShrink: 0 }} />
                      </div>
                      <div className="kpi-list">
                        {summaryData?.share_of_shelf?.[platform] && 
                          Object.entries(summaryData.share_of_shelf[platform]).map(([brand, pct]) => (
                            <div key={brand} className="kpi-row">
                              <span className="kpi-label">{brand}</span>
                              <span className="kpi-value" style={{ color: brandColors[brand] }}>{pct}%</span>
                            </div>
                          ))
                        }
                      </div>
                    </div>

                    {/* Pricing KPI */}
                    <div className="glass-card">
                      <div className="kpi-header">
                        <span className="kpi-header-label">Promo Share (% on deal)</span>
                        <DollarSign size={20} style={{ color: '#10b981', flexShrink: 0 }} />
                      </div>
                      <div className="kpi-list">
                        {summaryData?.pricing?.filter(p => p.platform === platform).map(p => (
                          <div key={p.brand} className="kpi-row">
                            <span className="kpi-label">{p.brand}</span>
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                              <span className="text-sm text-muted">${p.avg_price}</span>
                              <span style={{ color: '#ef4444', fontWeight: 700 }}>{p.promo_share}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Chart + Leaderboard */}
                  <div className="dashboard-grid">
                    {/* Shelf Share Chart */}
                    <div className="glass-card">
                      <h3 className="section-title">Share of Shelf (30-day History)</h3>
                      <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                            <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                            <YAxis stroke="#94a3b8" unit="%" tick={{ fontSize: 12 }} />
                            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }} />
                            <Legend />
                            <Line type="monotone" dataKey="Intel_Shelf" name="Intel" stroke={brandColors.Intel} activeDot={{ r: 6 }} strokeWidth={2} />
                            <Line type="monotone" dataKey="AMD_Shelf" name="AMD" stroke={brandColors.AMD} strokeWidth={2} />
                            <Line type="monotone" dataKey="Qualcomm_Shelf" name="Qualcomm" stroke={brandColors.Qualcomm} strokeWidth={2} />
                            <Line type="monotone" dataKey="Apple_Shelf" name="Apple" stroke={brandColors.Apple} strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Leaderboard */}
                    <div className="glass-card leaderboard-card">
                      <div>
                        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Trophy size={18} style={{ color: '#f59e0b' }} /> Competitiveness
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {leaderboard.map((item, idx) => (
                            <div key={item.brand} className="leaderboard-item">
                              <span className="leaderboard-rank" style={{ color: idx === 0 ? '#f59e0b' : '#94a3b8' }}>
                                #{idx + 1}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <span style={{ fontWeight: 700 }}>{item.brand}</span>
                                  <span style={{ fontWeight: 800, color: brandColors[item.brand] }}>{item.score} pts</span>
                                </div>
                                <div className="leaderboard-bar-bg">
                                  <div className="leaderboard-bar-fill" style={{ width: `${item.score}%`, background: brandColors[item.brand] }}></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs" style={{ margin: '16px 0 0 0', color: '#64748b', lineHeight: 1.4 }}>
                        *Score rolls up Compliance (40%), Visibility (30%), &amp; Promo intensity (30%).
                      </p>
                    </div>
                  </div>

                  {/* Compliance Chart */}
                  <div className="glass-card">
                    <h3 className="section-title">Compliance Score Trend (30-day History)</h3>
                    <div className="chart-wrapper">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                          <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                          <YAxis stroke="#94a3b8" unit="%" tick={{ fontSize: 12 }} />
                          <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }} />
                          <Legend />
                          <Line type="monotone" dataKey="Intel_Comp" name="Intel" stroke={brandColors.Intel} strokeWidth={2} />
                          <Line type="monotone" dataKey="AMD_Comp" name="AMD" stroke={brandColors.AMD} strokeWidth={2} />
                          <Line type="monotone" dataKey="Qualcomm_Comp" name="Qualcomm" stroke={brandColors.Qualcomm} strokeWidth={2} />
                          <Line type="monotone" dataKey="Apple_Comp" name="Apple" stroke={brandColors.Apple} strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* =================== TAB 2: SKU EXPLORER =================== */}
          {activeTab === 'sku_explorer' && (
            <div className="glass-card">
              <h3 className="page-title">SKU Explorer &amp; Auditing</h3>
              
              {/* Filters */}
              <div className="filters-bar">
                <div className="filters-left">
                  <div className="search-box">
                    <Search size={16} className="text-muted" />
                    <input 
                      type="text" 
                      placeholder="Search SKU, name, CPU..." 
                      className="search-input" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <select className="input-field" value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
                    <option value="">All Brands</option>
                    <option value="Intel">Intel</option>
                    <option value="AMD">AMD</option>
                    <option value="Qualcomm">Qualcomm</option>
                    <option value="Apple">Apple</option>
                  </select>

                  <select className="input-field" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                    <option value="">All Types</option>
                    <option value="Notebook">Notebook</option>
                    <option value="Desktop">Desktop</option>
                  </select>
                  
                  <button className="btn-primary" onClick={fetchProducts}>
                    <RefreshCw size={16} /> Filter
                  </button>
                </div>

                <button className="btn-secondary" onClick={handleExportCSV} disabled={products.length === 0}>
                  <Download size={16} /> Export CSV
                </button>
              </div>

              {/* Table */}
              {loadingProducts ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '50px 0' }}>
                  <RefreshCw className="animate-spin" size={24} />
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Processor</th>
                        <th>Price</th>
                        <th>Compliance</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600, color: '#6366f1', whiteSpace: 'nowrap' }}>{p.sku}</td>
                          <td>{p.name}</td>
                          <td><span className="badge">{p.type}</span></td>
                          <td style={{ whiteSpace: 'nowrap' }}>{p.processor}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {p.on_promo ? (
                              <div>
                                <span style={{ textDecoration: 'line-through', fontSize: '0.8rem', color: '#64748b', display: 'block' }}>${p.original_price}</span>
                                <span style={{ color: '#ef4444', fontWeight: 600 }}>${p.current_price}</span>
                              </div>
                            ) : (
                              <span>${p.current_price}</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${p.compliance_score >= 100 ? 'badge-pass' : 'badge-fail'}`}>
                              {p.compliance_score}%
                            </span>
                          </td>
                          <td>
                            <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleViewProductDetails(p.id)}>
                              Audit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* =================== TAB 3: BANNERS =================== */}
          {activeTab === 'banners' && (
            <div className="glass-card">
              <h3 className="page-title">Daily Homepage Ad Share</h3>
              
              {loadingBanners ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '50px 0' }}>
                  <RefreshCw className="animate-spin" size={24} />
                </div>
              ) : (
                <div className="grid-3">
                  {banners.map(b => (
                    <div key={b.id} className="glass-card" style={{ padding: '16px' }}>
                      <div className="banner-img-placeholder">
                        <span style={{ fontSize: '1.3rem', fontWeight: 800, textTransform: 'uppercase', color: brandColors[b.featured_brand] }}>
                          {b.featured_brand} Banner
                        </span>
                        {b.discount_percentage > 0 && (
                          <div className="banner-discount-tag">
                            {b.discount_percentage}% OFF
                          </div>
                        )}
                      </div>
                      <div style={{ marginTop: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
                          <span style={{ fontWeight: 700, color: brandColors[b.featured_brand] }}>{b.featured_brand} Promo</span>
                          <span className="text-sm text-muted">{b.timestamp}</span>
                        </div>
                        <a href={b.link_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#3b82f6', fontSize: '0.9rem', fontWeight: 600 }}>
                          View Campaign <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =================== TAB 4: AI COPILOT =================== */}
          {activeTab === 'copilot' && (
            <div className="glass-card copilot-container">
              <div className="copilot-header">
                <h3 className="page-title" style={{ marginBottom: '4px' }}>AI Competitive Copilot</h3>
                <p className="text-sm text-muted">Ask natural language questions about database metrics.</p>
              </div>
              
              {/* Chat Messages */}
              <div className="chat-messages">
                {chatMessages.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`chat-bubble ${msg.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}
                    style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}
                  >
                    {msg.text}
                  </div>
                ))}
                {sendingChat && (
                  <div className="chat-bubble chat-bubble-assistant" style={{ padding: '12px 18px' }}>
                    <RefreshCw className="animate-spin" size={18} />
                  </div>
                )}
              </div>
              
              {/* Chat Input */}
              <div className="chat-input-bar">
                <input 
                  type="text" 
                  className="input-field chat-input" 
                  placeholder="e.g. Which brand has the best compliance score on Newegg?" 
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                />
                <button className="btn-primary" onClick={handleSendChatMessage} disabled={sendingChat}>
                  <Send size={18} /> Send
                </button>
              </div>
            </div>
          )}

          {/* =================== SKU AUDIT MODAL =================== */}
          {selectedProduct && (
            <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                
                {/* Modal Header */}
                <div className="modal-header">
                  <div style={{ minWidth: 0 }}>
                    <span style={{ color: brandColors[selectedProduct.brand], fontWeight: 700, textTransform: 'uppercase', fontSize: '0.85rem' }}>
                      {selectedProduct.brand} • {selectedProduct.sku}
                    </span>
                    <h2 style={{ margin: '4px 0 0 0', fontSize: '1.35rem', fontWeight: 800, lineHeight: 1.3 }}>{selectedProduct.name}</h2>
                  </div>
                  <button className="btn-secondary" style={{ flexShrink: 0 }} onClick={() => setSelectedProduct(null)}>
                    Close
                  </button>
                </div>

                {/* Specs Grid */}
                <div className="modal-specs-grid">
                  <div className="spec-item">
                    <span className="spec-item-label">Processor / SoC</span>
                    <p className="spec-item-value">{selectedProduct.processor}</p>
                  </div>
                  <div className="spec-item">
                    <span className="spec-item-label">GPU</span>
                    <p className="spec-item-value">{selectedProduct.specs.GPU}</p>
                  </div>
                  <div className="spec-item">
                    <span className="spec-item-label">RAM / Storage</span>
                    <p className="spec-item-value">{selectedProduct.specs.RAM} / {selectedProduct.specs.Storage}</p>
                  </div>
                </div>

                {/* Compliance Checklist */}
                <div className="glass-card" style={{ marginBottom: '24px', background: 'rgba(255, 255, 255, 0.02)' }}>
                  <h3 className="section-title">Latest Compliance Checklist</h3>
                  <div className="modal-checks-grid">
                    {[
                      { code: "S1", name: "Brand Name in Title (List)", val: selectedProduct.history[selectedProduct.history.length-1]?.audit?.S1 },
                      { code: "S2", name: "Badge Present (List)", val: selectedProduct.history[selectedProduct.history.length-1]?.audit?.S2 },
                      { code: "P1", name: "Brand Name in Title (Product)", val: selectedProduct.history[selectedProduct.history.length-1]?.audit?.P1 },
                      { code: "P2", name: "Badge Present (Product)", val: selectedProduct.history[selectedProduct.history.length-1]?.audit?.P2 },
                      { code: "P3", name: "Specs Table Compliance", val: selectedProduct.history[selectedProduct.history.length-1]?.audit?.P3 },
                      { code: "P4", name: "Brand Rich Media", val: selectedProduct.history[selectedProduct.history.length-1]?.audit?.P4 },
                      { code: "P5", name: "OEM Rich Media", val: selectedProduct.history[selectedProduct.history.length-1]?.audit?.P5 }
                    ].map(item => (
                      <div key={item.code} className="check-item">
                        <div className="check-item-label">
                          <span className="check-code">{item.code}</span>
                          <span className="check-name">{item.name}</span>
                        </div>
                        {item.val ? (
                          <CheckCircle2 size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                        ) : (
                          <XCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price History Chart */}
                <div className="glass-card" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                  <h3 className="section-title">Scraped Price Timeline</h3>
                  <div className="chart-wrapper" style={{ height: '200px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selectedProduct.history} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                        <XAxis dataKey="timestamp" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="price" name="Price ($)" stroke={brandColors[selectedProduct.brand]} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;