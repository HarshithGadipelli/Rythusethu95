import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const AssistantOverlay = ({ isActive, onClose, interimText, aiMessage, step }) => {
  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
        animate={{ opacity: 1, backdropFilter: "blur(15px)" }}
        exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          background: "rgba(10, 25, 15, 0.85)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          padding: "2rem",
          textAlign: "center"
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "2rem",
            right: "2rem",
            background: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            color: "white",
            padding: "0.5rem 1.5rem",
            borderRadius: "30px",
            cursor: "pointer",
            fontSize: "1rem",
            transition: "all 0.3s ease"
          }}
          onMouseEnter={(e) => e.target.style.background = "rgba(239, 68, 68, 0.8)"}
          onMouseLeave={(e) => e.target.style.background = "rgba(255, 255, 255, 0.1)"}
        >
          Close Assistant
        </button>

        {/* Status Text */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            color: "var(--green-pale)",
            fontSize: "1.2rem",
            textTransform: "uppercase",
            letterSpacing: "2px",
            marginBottom: "2rem"
          }}
        >
          {aiMessage ? "AI is speaking..." : "Listening to you..."}
        </motion.div>

        {/* Pulsing Microphone Wave */}
        <div style={{ position: "relative", width: "150px", height: "150px", margin: "2rem 0" }}>
          {/* Outer Ripple */}
          {!aiMessage && (
            <>
              <motion.div
                animate={{ scale: [1, 1.5, 2], opacity: [0.8, 0.3, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  background: "var(--green-mid)", borderRadius: "50%", zIndex: 1
                }}
              />
              <motion.div
                animate={{ scale: [1, 1.3, 1.8], opacity: [0.8, 0.4, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeOut", delay: 0.5 }}
                style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  background: "var(--primary)", borderRadius: "50%", zIndex: 1
                }}
              />
            </>
          )}

          {/* AI Speaking Wave */}
          {aiMessage && (
            <motion.div
              animate={{ scale: [1, 1.1, 1], rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{
                position: "absolute", top: "-10%", left: "-10%", right: "-10%", bottom: "-10%",
                border: "4px dashed var(--green-pale)", borderRadius: "50%", zIndex: 1
              }}
            />
          )}

          {/* Core Mic Circle */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: aiMessage ? "rgba(34, 197, 94, 0.2)" : "linear-gradient(135deg, var(--green-primary), var(--primary))",
            borderRadius: "50%", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 30px rgba(34, 197, 94, 0.5)",
            border: aiMessage ? "2px solid var(--green-mid)" : "none"
          }}>
            <span style={{ fontSize: "3rem" }}>{aiMessage ? "🤖" : "🎙️"}</span>
          </div>
        </div>

        {/* Dialogue Box */}
        <div style={{
          marginTop: "3rem",
          maxWidth: "800px",
          width: "100%",
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "16px",
          padding: "2rem",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
        }}>
          {aiMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--cream)", marginBottom: "1rem" }}
            >
              {aiMessage}
            </motion.div>
          )}

          <div style={{
            minHeight: "40px",
            fontSize: "1.2rem",
            color: interimText ? "var(--green-pale)" : "rgba(255,255,255,0.4)",
            fontStyle: interimText ? "italic" : "normal"
          }}>
            {interimText ? `"${interimText}..."` : "(Speak your answer clearly)"}
          </div>
        </div>

        {/* Progress Indication */}
        {step && (
          <div style={{ marginTop: "3rem", display: "flex", gap: "1rem" }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{
                width: "40px", height: "8px", borderRadius: "4px",
                background: s <= step ? "var(--green-mid)" : "rgba(255,255,255,0.2)",
                transition: "background 0.3s ease"
              }} />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default AssistantOverlay;
