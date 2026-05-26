import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDark?: boolean;
  /** When true, overlay and action buttons do not dismiss or re-trigger the modal actions. */
  actionsDisabled?: boolean;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
  isDark = false,
  actionsDisabled = false,
}: ConfirmModalProps) {
  const overlayBg = isDark ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.45)";
  const cardBg = isDark ? "#2C2C2E" : "#FFFFFF";
  const titleColor = isDark ? "#F4F4F5" : "#111827";
  const messageColor = isDark ? "#9BA4B4" : "#6B7280";
  const dividerColor = isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB";
  const cancelColor = isDark ? "#60A5FA" : "#2563EB";
  const confirmColor = destructive ? "#EF4444" : cancelColor;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => {
            if (actionsDisabled) return;
            onCancel();
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9000,
            background: overlayBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <motion.div
            key="confirm-card"
            initial={{ scale: 0.92, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: cardBg,
              borderRadius: 20,
              width: "100%",
              maxWidth: 320,
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ padding: "24px 20px 16px", textAlign: "center" }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: titleColor, margin: "0 0 8px" }}>
                {title}
              </h2>
              <p style={{ fontSize: 13, color: messageColor, lineHeight: 1.5, margin: 0, whiteSpace: "pre-line" }}>
                {message}
              </p>
            </div>

            <div style={{ height: 1, background: dividerColor }} />

            <div style={{ display: "flex" }}>
              <button
                type="button"
                disabled={actionsDisabled}
                onClick={() => {
                  if (actionsDisabled) return;
                  onCancel();
                }}
                style={{
                  flex: 1,
                  padding: "14px 0",
                  background: "transparent",
                  border: "none",
                  fontSize: 16,
                  fontWeight: 600,
                  color: cancelColor,
                  cursor: actionsDisabled ? "not-allowed" : "pointer",
                  opacity: actionsDisabled ? 0.45 : 1,
                }}
              >
                {cancelLabel}
              </button>
              <div style={{ width: 1, background: dividerColor }} />
              <button
                type="button"
                disabled={actionsDisabled}
                onClick={() => {
                  if (actionsDisabled) return;
                  onConfirm();
                }}
                style={{
                  flex: 1,
                  padding: "14px 0",
                  background: "transparent",
                  border: "none",
                  fontSize: 16,
                  fontWeight: destructive ? 700 : 600,
                  color: confirmColor,
                  cursor: actionsDisabled ? "not-allowed" : "pointer",
                  opacity: actionsDisabled ? 0.45 : 1,
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
