"use client";

import React, { useEffect } from "react";

interface ModalBackdropProps {
  onClose?: () => void;
  /** Extra classes for the inner panel (e.g. max-w-md). Defaults to max-w-lg. */
  panelClassName?: string;
  children: React.ReactNode;
}

/**
 * Shared backdrop for all form/detail modals.
 * - Mobile: slides up from the bottom (bottom sheet)
 * - Desktop: centered modal
 * - Backdrop: translucent gradient + blur (calendar visible behind)
 */
const ModalBackdrop: React.FC<ModalBackdropProps> = ({
  onClose,
  panelClassName = "max-w-lg",
  children,
}) => {
  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{
        background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.6) 100%)",
        backdropFilter: "blur(3px)",
      }}
      onClick={onClose}
    >
      <div
        className={`w-full ${panelClassName} rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-y-auto`}
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default ModalBackdrop;
