import React, { useState } from 'react';
import { Sprout, CheckCircle, PackagePlus } from 'lucide-react';
import API from '../../api/api';
import { useAuth } from '../../context/AuthContext';

export default function AddCrop() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    category: 'vegetable',
    price: '',
    quantity: '',
    unit: 'kg',
    description: '',
    isOrganic: false
  });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setMsg("You must be logged in to add a crop.");
      return;
    }
    setLoading(true);
    try {
      const payload = { ...formData, farmer: user._id };
      await API.post('/crops/add', payload);
      setMsg(`Successfully listed ${formData.name} for sale!`);
      setFormData({ name: '', category: 'vegetable', price: '', quantity: '', unit: 'kg', description: '', isOrganic: false });
    } catch (err) {
      setMsg("Failed to list item. Ensure all fields are valid.");
    }
    setLoading(false);
  };

  return (
    <div className="page-wrapper fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <PackagePlus size={32} color="#16a34a" />
        <h1 className="page-title" style={{ margin: 0 }}>List Produce or Byproducts</h1>
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        You can now list your main harvest, or monetize farm byproducts like Hay Bales and Slurry.
      </p>

      {msg && (
        <div className="alert" style={{ background: "rgba(34, 197, 94, 0.1)", color: "#166534", border: "1px solid #86efac", padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={20} /> {msg}
        </div>
      )}

      <div className="glass-card mt-4" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Item Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Tomato, Organic Hay, Cow Dung Slurry" className="form-input" required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Category</label>
              <select name="category" value={formData.category} onChange={handleChange} className="form-input" style={{ width: '100%' }}>
                <option value="vegetable">Vegetable</option>
                <option value="fruit">Fruit</option>
                <option value="grain">Grain</option>
                <option value="pulse">Pulse</option>
                <option value="spice">Spice</option>
                <option value="dairy">Dairy</option>
                <option value="byproduct">Farm Byproduct (Hay, Slurry, Compost)</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Unit</label>
              <select name="unit" value={formData.unit} onChange={handleChange} className="form-input" style={{ width: '100%' }}>
                <option value="kg">Kilograms (kg)</option>
                <option value="tonne">Tonnes</option>
                <option value="litre">Litres (L)</option>
                <option value="bale">Bales (For Hay)</option>
                <option value="piece">Pieces</option>
                <option value="dozen">Dozens</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Quantity Available</label>
              <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} placeholder={`Amount in ${formData.unit}`} className="form-input" required min="1" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Price (₹ per {formData.unit})</label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="Selling Price" className="form-input" required min="1" />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Briefly describe the quality, origin, or usage." className="form-input" style={{ minHeight: '80px', resize: 'vertical' }}></textarea>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--green-pale)', padding: '1rem', borderRadius: '8px', cursor: 'pointer' }}>
            <input type="checkbox" name="isOrganic" checked={formData.isOrganic} onChange={handleChange} style={{ width: '20px', height: '20px' }} /> 
            <span style={{ fontWeight: 600, color: 'var(--green-deep)' }}>This product is Certified Organic / Pesticide-Free</span>
          </label>

          <button type="submit" className="btn-primary mt-2" disabled={loading} style={{ padding: '1rem', fontSize: '1.1rem' }}>
            {loading ? "Listing..." : "List Item on Marketplace"}
          </button>

        </form>
      </div>
    </div>
  );
}