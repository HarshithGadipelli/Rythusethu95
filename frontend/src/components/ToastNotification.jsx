import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCheck, X } from 'lucide-react';
import { io } from 'socket.io-client';
import { BASE_URL } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function ToastNotification() {
  const [toasts, setToasts] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const socket = io(BASE_URL);
    socket.on("notification", (data) => {
      if (data.userId === user._id) {
        const newToast = { id: Date.now(), ...data };
        setToasts(prev => [...prev, newToast]);
        
        // Play WhatsApp style sound
        try {
          const audio = new Audio("https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=success-1-6297.mp3");
          audio.volume = 0.5;
          audio.play();
        } catch (e) {}

        // Auto remove after 5 seconds
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== newToast.id));
        }, 5000);
      }
    });

    return () => socket.disconnect();
  }, [user]);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 100000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, x: 100 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
              padding: '12px 16px',
              minWidth: '280px',
              maxWidth: '350px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              borderLeft: '5px solid #25D366' // WhatsApp green
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#075E54', fontSize: '0.95rem' }}>
                <span style={{ fontSize: '1.2rem' }}>
                  {toast.type === "order" ? "📦" : toast.type === "delivery" ? "🚚" : toast.type === "payment" ? "💰" : "🔔"}
                </span>
                {toast.title}
              </div>
              <button onClick={() => removeToast(toast.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ color: '#4a4a4a', fontSize: '0.9rem', lineHeight: 1.4 }}>
              {toast.message}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', color: '#999', fontSize: '0.75rem', marginTop: '2px' }}>
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              <CheckCheck size={14} color="#34B7F1" />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
