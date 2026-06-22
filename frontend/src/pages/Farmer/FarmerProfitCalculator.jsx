import React, { useState } from "react";
import { Calculator, DollarSign, Sprout, Truck, Briefcase } from "lucide-react";
import { motion } from "framer-motion";

export default function FarmerProfitCalculator() {
  const [inputs, setInputs] = useState({
    cropName: "",
    expectedYield: "",
    expectedPrice: "",
    seedCost: "",
    fertilizerCost: "",
    laborCost: "",
    transportCost: "",
  });
  
  const platformFeePercent = 2; // 2% platform fee

  const handleChange = (e) => {
    setInputs({ ...inputs, [e.target.name]: e.target.value });
  };

  const calculate = () => {
    const yieldKg = Number(inputs.expectedYield) || 0;
    const pricePerKg = Number(inputs.expectedPrice) || 0;
    const grossRevenue = yieldKg * pricePerKg;

    const seeds = Number(inputs.seedCost) || 0;
    const fertilizer = Number(inputs.fertilizerCost) || 0;
    const labor = Number(inputs.laborCost) || 0;
    const transport = Number(inputs.transportCost) || 0;

    const totalInputCosts = seeds + fertilizer + labor + transport;
    
    const platformFee = grossRevenue * (platformFeePercent / 100);
    const totalDeductions = totalInputCosts + platformFee;
    
    const netProfit = grossRevenue - totalDeductions;
    const profitMargin = grossRevenue > 0 ? ((netProfit / grossRevenue) * 100).toFixed(1) : 0;

    return { grossRevenue, totalInputCosts, platformFee, totalDeductions, netProfit, profitMargin };
  };

  const results = calculate();

  return (
    <div className="glass-card" style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <Calculator size={28} color="var(--primary)" />
        <h2 style={{ margin: 0, color: "var(--text-dark)" }}>Advanced Crop Profit Calculator</h2>
      </div>
      
      <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
        Estimate your exact Net Profit Margin before listing your crop. Include all operational costs to see your true take-home earnings.
      </p>

      <div className="grid-2" style={{ gap: "2rem", alignItems: "start" }}>
        {/* INPUTS SECTION */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group">
            <label className="field-label">Crop Name</label>
            <input type="text" className="rs-input" name="cropName" placeholder="e.g. Tomatoes" value={inputs.cropName} onChange={handleChange} />
          </div>
          
          <div className="grid-2">
            <div className="form-group">
              <label className="field-label">Expected Yield (kg)</label>
              <input type="number" className="rs-input" name="expectedYield" placeholder="1000" value={inputs.expectedYield} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="field-label">Expected Price (₹/kg)</label>
              <input type="number" className="rs-input" name="expectedPrice" placeholder="40" value={inputs.expectedPrice} onChange={handleChange} />
            </div>
          </div>

          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1rem", marginTop: "0.5rem" }}>
            <h4 style={{ color: "var(--text-mid)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Sprout size={18} /> Operational Costs (₹)
            </h4>
            
            <div className="grid-2 mb-2">
              <div className="form-group">
                <label className="field-label">Seed Cost</label>
                <input type="number" className="rs-input" name="seedCost" placeholder="1500" value={inputs.seedCost} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="field-label">Fertilizer/Pesticide</label>
                <input type="number" className="rs-input" name="fertilizerCost" placeholder="2000" value={inputs.fertilizerCost} onChange={handleChange} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="field-label">Labor Cost</label>
                <input type="number" className="rs-input" name="laborCost" placeholder="3000" value={inputs.laborCost} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="field-label">Transport/Logistics</label>
                <input type="number" className="rs-input" name="transportCost" placeholder="1000" value={inputs.transportCost} onChange={handleChange} />
              </div>
            </div>
          </div>
        </div>

        {/* RESULTS SECTION */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "1.5rem", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}
        >
          <h3 style={{ color: "var(--text-dark)", marginBottom: "1.5rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
            Profit Projection {inputs.cropName && `for ${inputs.cropName}`}
          </h3>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", fontSize: "1.1rem" }}>
            <span style={{ color: "var(--text-mid)" }}>Gross Revenue:</span>
            <span style={{ fontWeight: "bold", color: "var(--text-dark)" }}>₹{results.grossRevenue.toLocaleString()}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.95rem" }}>
            <span style={{ color: "var(--red-deep)", display: "flex", alignItems: "center", gap: "0.3rem" }}><Briefcase size={14}/> Input Costs:</span>
            <span style={{ color: "var(--red-deep)" }}>- ₹{results.totalInputCosts.toLocaleString()}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem", fontSize: "0.95rem", borderBottom: "1px dashed #cbd5e1", paddingBottom: "1rem" }}>
            <span style={{ color: "var(--red-deep)", display: "flex", alignItems: "center", gap: "0.3rem" }}>Platform Fee (2%):</span>
            <span style={{ color: "var(--red-deep)" }}>- ₹{results.platformFee.toLocaleString()}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: results.netProfit >= 0 ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)", padding: "1rem", borderRadius: "8px", border: `1px solid ${results.netProfit >= 0 ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}` }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.9rem", color: results.netProfit >= 0 ? "var(--green-deep)" : "var(--red-deep)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>Net Profit</span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>Margin: {results.profitMargin}%</span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: "bold", color: results.netProfit >= 0 ? "var(--green-primary)" : "var(--red-deep)" }}>
              {results.netProfit >= 0 ? `₹${results.netProfit.toLocaleString()}` : `-₹${Math.abs(results.netProfit).toLocaleString()}`}
            </div>
          </div>

          {results.profitMargin < 20 && results.grossRevenue > 0 && (
            <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--yellow-wheat)", background: "rgba(234, 179, 8, 0.1)", padding: "0.8rem", borderRadius: "8px" }}>
              ⚠️ Your profit margin is below 20%. Consider utilizing group selling or optimizing transport costs!
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
