import React, { useRef, useEffect, useState } from "react";
import { Subscription } from "@/lib/subscriptions";
import { getServiceColor } from "@/lib/icons";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useI18n } from "@/lib/i18n";

interface SpendingChartProps {
  subscriptions: Subscription[];
  totalSpend: number;
  userLocale: string;
  isDarkMode: boolean;
  isVisible: boolean;
  onClose: () => void;
}

function categoryColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 60%, 55%)`;
}

const SpendingChart: React.FC<SpendingChartProps> = ({
  subscriptions,
  totalSpend,
  userLocale,
  isDarkMode,
  isVisible,
  onClose,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [highlightedSegment, setHighlightedSegment] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"category" | "item">("category");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const { t, tpl } = useI18n();

  // Filter out subscriptions that have 0 amount or would be too small to display
  const validSubscriptions = subscriptions.filter((sub) => sub.amount > 0);

  // For animation timing and click outside handling
  useEffect(() => {
    // Close chart when clicking outside
    const handleOutsideClick = (e: MouseEvent) => {
      if (chartRef.current && !chartRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener("click", handleOutsideClick);

      // Prevent background scrolling on mobile
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("click", handleOutsideClick);
      document.body.style.overflow = "";
    };
  }, [isVisible, onClose]);

  useEscapeKey(onClose, isVisible);

  if (!isVisible) {
    return null;
  }

  // Format currency
  const formatCurrency = (amount: number): string => {
    const currency = subscriptions[0]?.currency.replace("€", "EUR") || "EUR";
    return amount.toLocaleString(userLocale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    });
  };

  // Calculate percentages and chart data
  type ChartSegment = {
    subscription: Subscription;
    percentage: number;
    startAngle: number;
    endAngle: number;
    color: string;
  };

  type CategorySegment = {
    name: string;
    total: number;
    items: Subscription[];
    percentage: number;
    startAngle: number;
    endAngle: number;
    color: string;
  };

  // Sort subscriptions by amount in descending order for better visual representation
  const sortedSubscriptions = [...validSubscriptions].sort(
    (a, b) => b.amount - a.amount
  );

  // Build individual chart segments
  const chartSegments: ChartSegment[] = [];
  let cumulativePercentage = 0;

  sortedSubscriptions.forEach((subscription) => {
    const percentage = (subscription.amount / totalSpend) * 100;
    const startAngle = (cumulativePercentage / 100) * 360;
    cumulativePercentage += percentage;
    const endAngle = (cumulativePercentage / 100) * 360;

    chartSegments.push({
      subscription,
      percentage,
      startAngle,
      endAngle,
      color: `#${getServiceColor(subscription.name, subscription.color)}`,
    });
  });

  // Build category segments
  const uncategorizedLabel = t.spendingChart.uncategorized;
  const categoryMap = new Map<string, { total: number; items: Subscription[] }>();
  sortedSubscriptions.forEach((sub) => {
    const key = sub.category && sub.category.trim() ? sub.category.trim() : uncategorizedLabel;
    const existing = categoryMap.get(key);
    if (existing) {
      existing.total += sub.amount;
      existing.items.push(sub);
    } else {
      categoryMap.set(key, { total: sub.amount, items: [sub] });
    }
  });

  const categorySegments: CategorySegment[] = [];
  let catCumulative = 0;
  Array.from(categoryMap.entries())
    .sort(([, a], [, b]) => b.total - a.total)
    .forEach(([name, { total, items }]) => {
      const percentage = (total / totalSpend) * 100;
      const startAngle = (catCumulative / 100) * 360;
      catCumulative += percentage;
      const endAngle = (catCumulative / 100) * 360;
      categorySegments.push({ name, total, items, percentage, startAngle, endAngle, color: categoryColor(name) });
    });

  // Function to calculate segment path
  const describeArc = (
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number
  ): string => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);

    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
      "M",
      x,
      y,
      "L",
      start.x,
      start.y,
      "A",
      radius,
      radius,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
      "Z",
    ].join(" ");
  };

  // Convert polar coordinates to Cartesian
  const polarToCartesian = (
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
  ): { x: number; y: number } => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;

    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  // Calculate midpoint for label positioning
  const getMidpointCoordinates = (
    centerX: number,
    centerY: number,
    radius: number,
    startAngle: number,
    endAngle: number
  ): [number, number] => {
    const midAngle = (startAngle + endAngle) / 2;
    const midpoint = polarToCartesian(centerX, centerY, radius * 0.7, midAngle);
    return [midpoint.x, midpoint.y];
  };

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) { next.delete(name); } else { next.add(name); }
      return next;
    });
  };

  const activeCategorySegments = viewMode === "category" ? categorySegments : chartSegments;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black bg-opacity-60 animate-fadeIn overflow-y-auto px-4 py-6 sm:py-8">
      <div
        ref={chartRef}
        className={`relative w-full max-w-md sm:max-w-2xl mx-auto p-4 sm:p-6 rounded-2xl shadow-2xl transform transition-all animate-scaleIn overflow-y-auto ${
          isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
        }`}
        style={{ maxHeight: "calc(100vh - 3rem)" }}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-500 hover:text-gray-700 focus:outline-none z-10"
          aria-label={t.spendingChart.closeButton}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h2 className="text-xl sm:text-2xl font-bold text-center mb-1 sm:mb-2">
          {t.spendingChart.title}
        </h2>
        <h3 className="text-2xl sm:text-3xl font-bold text-center mb-3">
          {formatCurrency(totalSpend)}
        </h3>

        {/* View toggle */}
        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={() => { setViewMode("category"); setHighlightedSegment(null); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              viewMode === "category"
                ? "bg-blue-600 text-white"
                : isDarkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
          >
            {t.spendingChart.viewByCategory}
          </button>
          <button
            onClick={() => { setViewMode("item"); setHighlightedSegment(null); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              viewMode === "item"
                ? "bg-blue-600 text-white"
                : isDarkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
          >
            {t.spendingChart.viewByItem}
          </button>
        </div>

        {/* On desktop: chart + legend side by side; on mobile: stacked */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
          <div className="flex justify-center sm:flex-shrink-0">
            <div className="relative w-56 h-56 sm:w-64 sm:h-64">
              <svg
                className="w-full h-full"
                viewBox="0 0 100 100"
                style={{ overflow: "visible" }}
              >
                {activeCategorySegments.map((segment, i) => {
                  const seg = segment as ChartSegment & CategorySegment;
                  const isHighlighted = highlightedSegment === i;

                  if (activeCategorySegments.length === 1) {
                    return (
                      <circle
                        key={`segment-${i}`}
                        cx="50"
                        cy="50"
                        r="45"
                        fill={seg.color}
                        className="animate-fadeIn"
                      />
                    );
                  }

                  const path = describeArc(50, 50, 45, seg.startAngle, seg.endAngle);
                  const [labelX, labelY] = getMidpointCoordinates(50, 50, 45, seg.startAngle, seg.endAngle);

                  return (
                    <g key={`segment-${i}`}>
                      <path
                        d={path}
                        fill={seg.color}
                        className="animate-fadeIn cursor-pointer hover:opacity-90"
                        style={{
                          animation: `fadeIn 0.3s ease-out ${i * 0.1}s forwards`,
                          opacity: 0,
                          transform: isHighlighted ? "scale(1.05)" : "scale(1)",
                          transformOrigin: "50px 50px",
                          transition: "transform 0.2s ease",
                        }}
                        onMouseEnter={() => setHighlightedSegment(i)}
                        onMouseLeave={() => setHighlightedSegment(null)}
                      />

                      {seg.percentage > 8 && (
                        <g
                          className="animate-fadeSlideIn"
                          style={{
                            animation: `fadeSlideIn 0.5s ease-out ${0.3 + i * 0.1}s forwards`,
                            opacity: 0,
                          }}
                        >
                          <circle
                            cx={labelX}
                            cy={labelY}
                            r="10"
                            fill={isDarkMode ? "rgba(26, 32, 44, 0.8)" : "rgba(255, 255, 255, 0.8)"}
                          />
                          <text
                            x={labelX}
                            y={labelY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={isDarkMode ? "white" : "black"}
                            style={{ fontSize: "6px", fontWeight: "bold" }}
                          >
                            {Math.round(seg.percentage)}%
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Central circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="20"
                  fill={isDarkMode ? "#1a202c" : "#f7fafc"}
                  className="animate-scaleIn"
                />

                <text
                  x="50"
                  y="46"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-bold"
                  fill={isDarkMode ? "white" : "black"}
                  style={{ fontSize: "6px" }}
                >
                  {t.spendingChart.totalLabel}
                </text>

                <text
                  x="50"
                  y="54"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-bold"
                  fill={isDarkMode ? "white" : "black"}
                  style={{ fontSize: "5px" }}
                >
                  {formatCurrency(totalSpend).replace(/\.00/, "")}
                </text>
              </svg>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 w-full overflow-y-auto" style={{ maxHeight: "calc(100vh - 14rem)" }}>
            {viewMode === "category" ? (
              <div className="grid grid-cols-1 gap-2">
                {categorySegments.map((seg, i) => (
                  <div key={`cat-${i}`}>
                    <div
                      className={`flex items-center p-2 rounded-lg cursor-pointer ${
                        highlightedSegment === i
                          ? isDarkMode ? "bg-gray-700" : "bg-gray-100"
                          : ""
                      }`}
                      onMouseEnter={() => setHighlightedSegment(i)}
                      onMouseLeave={() => setHighlightedSegment(null)}
                      onClick={() => toggleCategory(seg.name)}
                    >
                      <div
                        className="w-4 h-4 rounded-full mr-2 flex-shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate flex items-center gap-1">
                          {seg.name}
                          <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                            {tpl(t.spendingChart.categoryItemCount, { count: seg.items.length })}
                          </span>
                          <span className={`ml-auto text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                            {expandedCategories.has(seg.name) ? "▲" : "▼"}
                          </span>
                        </div>
                        <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                          {formatCurrency(seg.total)} ({seg.percentage.toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                    {expandedCategories.has(seg.name) && (
                      <div className={`ml-6 mt-1 mb-1 border-l-2 pl-3 ${isDarkMode ? "border-gray-600" : "border-gray-200"}`}>
                        {seg.items.map((sub, j) => (
                          <div key={`sub-${i}-${j}`} className="flex items-center py-1 gap-2">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: `#${getServiceColor(sub.name, sub.color)}` }}
                            />
                            <span className="flex-1 text-sm truncate">{sub.name}</span>
                            <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                              {formatCurrency(sub.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {chartSegments.map((segment, i) => (
                  <div
                    key={`legend-${i}`}
                    className={`flex items-center animate-fadeSlideIn p-2 rounded-lg cursor-pointer ${
                      highlightedSegment === i
                        ? isDarkMode ? "bg-gray-700" : "bg-gray-100"
                        : ""
                    }`}
                    style={{
                      animation: `fadeSlideIn 0.5s ease-out ${0.3 + i * 0.1}s forwards`,
                    }}
                    onMouseEnter={() => setHighlightedSegment(i)}
                    onMouseLeave={() => setHighlightedSegment(null)}
                  >
                    <div
                      className="w-4 h-4 rounded-full mr-2 flex-shrink-0"
                      style={{ backgroundColor: `#${getServiceColor(segment.subscription.name, segment.subscription.color)}` }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {segment.subscription.name}
                      </div>
                      <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                        {formatCurrency(segment.subscription.amount)} (
                        {segment.percentage.toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpendingChart;
