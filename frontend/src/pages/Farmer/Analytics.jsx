import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingUp, IndianRupee, PieChart, Activity } from 'lucide-react';

export default function FarmerAnalytics() {
  const [costs, setCosts] = useState({
    seed: 0,
    fertilizer: 0,
    equipment: 0,
    labor: 0
  });
  const [expectedYield, setExpectedYield] = useState(0); // in kg
  const [marketPrice, setMarketPrice] = useState(0); // per kg

  const totalCost = Number(costs.seed) + Number(costs.fertilizer) + Number(costs.equipment) + Number(costs.labor);
  const grossRevenue = Number(expectedYield) * Number(marketPrice);
  const platformFee = grossRevenue * 0.05; // 5% fee
  const netProfit = grossRevenue - totalCost - platformFee;
  const roi = totalCost > 0 ? ((netProfit / totalCost) * 100).toFixed(2) : 0;

  const handleCostChange = (e) => {
    setCosts({ ...costs, [e.target.name]: e.target.value });
  };

  return (
    <div className="page-wrapper fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Calculator size={32} color="#f59e0b" />
        <h1 className="page-title" style={{ margin: 0 }}>Crop Profit Calculator</h1>
      </div>
      
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '1.1rem' }}>
        Calculate your expected profit margins by entering your input costs, yield, and current market prices. This tool helps you plan your season effectively.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Input Form */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-dark)' }}>
            <Activity size={20} /> Input Costs (₹)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Seed Costs</label>
              <input type="number" name="seed" value={costs.seed} onChange={handleCostChange} className="form-input" min="0" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Fertilizer & Pesticide Costs</label>
              <input type="number" name="fertilizer" value={costs.fertilizer} onChange={handleCostChange} className="form-input" min="0" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Equipment & Machinery</label>
              <input type="number" name="equipment" value={costs.equipment} onChange={handleCostChange} className="form-input" min="0" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Labor Costs</label>
              <input type="number" name="labor" value={costs.labor} onChange={handleCostChange} className="form-input" min="0" />
            </div>
            <hr style={{ borderColor: 'rgba(0,0,0,0.1)' }} />
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Expected Yield (kg or unit)</label>
              <input type="number" value={expectedYield} onChange={(e) => setExpectedYield(e.target.value)} className="form-input" min="0" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Expected Market Price (₹ per kg)</label>
              <input type="number" value={marketPrice} onChange={(e) => setMarketPrice(e.target.value)} className="form-input" min="0" />
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <motion.div 
            className="glass-card" 
            style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', borderLeft: '4px solid #f97316' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h4 style={{ color: '#c2410c', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Investment</h4>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#9a3412', display: 'flex', alignItems: 'center' }}>
              <IndianRupee size={28} /> {totalCost.toLocaleString()}
            </div>
          </motion.div>

          <motion.div 
            className="glass-card" 
            style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderLeft: '4px solid #22c55e' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h4 style={{ color: '#166534', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Projected Revenue</h4>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#14532d', display: 'flex', alignItems: 'center' }}>
              <IndianRupee size={28} /> {grossRevenue.toLocaleString()}
            </div>
          </motion.div>

          <motion.div 
            className="glass-card" 
            style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderLeft: '4px solid #3b82f6', position: 'relative', overflow: 'hidden' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <PieChart size={100} color="rgba(59, 130, 246, 0.1)" style={{ position: 'absolute', right: '-20px', bottom: '-20px' }} />
            <h4 style={{ color: '#1e40af', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Net Profit (After 5% Platform Fee)</h4>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: netProfit >= 0 ? '#1e40af' : '#b91c1c', display: 'flex', alignItems: 'center' }}>
              <IndianRupee size={28} /> {netProfit.toLocaleString()}
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '1rem', fontWeight: 600, color: netProfit >= 0 ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <TrendingUp size={16} /> ROI: {roi}%
            </div>
          </motion.div>

        </div>

      </div>
    </div>
  );
}