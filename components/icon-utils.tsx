import React from "react";
import { getServiceIcon, getServiceColor, getInitials, needsWhiteText } from "@/lib/icons";

/**
 * Renders a subscription icon for a given service name.
 * Uses simple-icons for brand icons; falls back to a seeded-color initials avatar.
 */
export const renderSubscriptionIcon = (
  name: string,
  overrideColor?: string | null,
  className?: string
): React.ReactNode => {
  const hex = getServiceColor(name, overrideColor);
  const brandColor = `#${hex}`;
  const icon = getServiceIcon(name);
  const baseClass = `relative flex items-center justify-center rounded-full overflow-hidden select-none ${className || ""}`;

  if (icon) {
    // Inline the SVG from simple-icons with a white fill on the brand background
    return (
      <div className={baseClass} style={{ backgroundColor: brandColor }}>
        <div
          className="absolute inset-0 flex items-center justify-center p-[22%]"
          dangerouslySetInnerHTML={{
            __html: icon.svg.replace(
              "<svg ",
              `<svg fill="${needsWhiteText(hex) ? "#ffffff" : "#000000"} `
            ),
          }}
        />
      </div>
    );
  }

  // Fallback: initials avatar
  const textColor = needsWhiteText(hex) ? "#ffffff" : "#000000";
  return (
    <div className={baseClass} style={{ backgroundColor: brandColor }}>
      <span className="text-xs font-bold leading-none" style={{ color: textColor }}>
        {getInitials(name)}
      </span>
    </div>
  );
};
