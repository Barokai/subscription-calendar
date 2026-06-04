import React, { useRef, useEffect, useState } from "react";
import { Income } from "@/lib/incomes";
import { getServiceColor } from "@/lib/icons";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useI18n } from "@/lib/i18n";

interface IncomeChartProps {
  incomes: Income[];
  totalIncome: number;
  userLocale: string;
  isDarkMode: boolean;
  isVisible: boolean;
  onClose: () => void;
}

const IncomeChart: React.FC<IncomeChartProps> = ({
  incomes,
  totalIncome,
  userLocale,
  isDarkMode,
  isVisible,
  onClose,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [highlightedSegment, setHighlightedSegment] = useState<number | null>(null);
  const { t } = useI18n();

  const validIncomes = incomes.filter((inc) => inc.amount > 0);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (chartRef.current && !chartRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener("click", handleOutsideClick);
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

  const formatCurrency = (amount: number): string => {
    const currency = validIncomes[0]?.currency || "EUR";
    return amount.toLocaleString(userLocale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    });
  };

  type IncomeSegment = {
    income: Income;
    percentage: number;
    startAngle: number;
    endAngle: number;
    color: string;
  };

  const sortedIncomes = [...validIncomes].sort((a, b) => b.amount - a.amount);
  const segments: IncomeSegment[] = [];
  let cumulative = 0;

  sortedIncomes.forEach((income) => {
    const percentage = totalIncome > 0 ? (income.amount / totalIncome) * 100 : 0;
    const startAngle = (cumulative / 100) * 360;
    cumulative += percentage;
    const endAngle = (cumulative / 100) * 360;
    segments.push({
      income,
      percentage,
      startAngle,
      endAngle,
      color: `#${getServiceColor(income.name, null)}`,
    });
  });

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
    return ["M", x, y, "L", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y, "Z"].join(" ");
  };

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
          aria-label={t.incomeChart.closeButton}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl sm:text-2xl font-bold text-center mb-1 sm:mb-2">
          {t.incomeChart.title}
        </h2>
        <h3 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-6 text-green-400">
          {formatCurrency(totalIncome)}
        </h3>

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
          <div className="flex justify-center sm:flex-shrink-0">
            <div className="relative w-56 h-56 sm:w-64 sm:h-64">
              <svg className="w-full h-full" viewBox="0 0 100 100" style={{ overflow: "visible" }}>
                {segments.map((segment, i) => {
                  const isHighlighted = highlightedSegment === i;

                  if (segments.length === 1) {
                    return (
                      <circle
                        key={`segment-${i}`}
                        cx="50"
                        cy="50"
                        r="45"
                        fill={segment.color}
                        className="animate-fadeIn"
                      />
                    );
                  }

                  const path = describeArc(50, 50, 45, segment.startAngle, segment.endAngle);
                  const [labelX, labelY] = getMidpointCoordinates(50, 50, 45, segment.startAngle, segment.endAngle);

                  return (
                    <g key={`segment-${i}`}>
                      <path
                        d={path}
                        fill={segment.color}
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

                      {segment.percentage > 8 && (
                        <g
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
                            {Math.round(segment.percentage)}%
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                <circle cx="50" cy="50" r="20" fill={isDarkMode ? "#1a202c" : "#f7fafc"} className="animate-scaleIn" />
                <text
                  x="50"
                  y="46"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isDarkMode ? "white" : "black"}
                  style={{ fontSize: "6px", fontWeight: "bold" }}
                >
                  {t.incomeChart.title}
                </text>
                <text
                  x="50"
                  y="54"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isDarkMode ? "#4ade80" : "#16a34a"}
                  style={{ fontSize: "4.5px" }}
                >
                  {formatCurrency(totalIncome).replace(/\.00/, "")}
                </text>
              </svg>
            </div>
          </div>

          <div className="flex-1 w-full overflow-y-auto" style={{ maxHeight: "calc(100vh - 14rem)" }}>
            <div className="grid grid-cols-1 gap-2">
              {segments.map((segment, i) => (
                <div
                  key={`legend-${i}`}
                  className={`flex items-center p-2 rounded-lg cursor-pointer ${
                    highlightedSegment === i
                      ? isDarkMode ? "bg-gray-700" : "bg-gray-100"
                      : ""
                  }`}
                  onMouseEnter={() => setHighlightedSegment(i)}
                  onMouseLeave={() => setHighlightedSegment(null)}
                >
                  <div
                    className="w-4 h-4 rounded-full mr-2 flex-shrink-0"
                    style={{ backgroundColor: segment.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{segment.income.name}</div>
                    <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {formatCurrency(segment.income.amount)} ({segment.percentage.toFixed(2)}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomeChart;
