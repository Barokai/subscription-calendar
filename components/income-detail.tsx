"use client";

import React from "react";
import { Income } from "@/lib/incomes";
import { renderSubscriptionIcon } from "./icon-utils";
import { getServiceColor } from "@/lib/icons";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useI18n } from "@/lib/i18n";

interface IncomeDetailProps {
  income: Income;
  position: { x: number; y: number };
  isDarkMode: boolean;
  userLocale: string;
  positionType?: "hover" | "click";
  onClose?: () => void;
  onEdit?: (income: Income) => void;
  onDelete?: (id: string) => void;
}

const IncomeDetail: React.FC<IncomeDetailProps> = ({
  income,
  position,
  isDarkMode,
  userLocale,
  positionType = "hover",
  onClose,
  onEdit,
  onDelete,
}) => {
  const { t } = useI18n();
  useEscapeKey(onClose ?? (() => {}), positionType === "click" && !!onClose);

  const color = `#${getServiceColor(income.name, null)}`;
  const fmtAmount = (n: number) =>
    n.toLocaleString(userLocale, {
      style: "currency",
      currency: income.currency.replace("€", "EUR") || "EUR",
    });

  const transform =
    positionType === "hover"
      ? "translate(-50%, calc(-100% - 20px))"
      : "translate(-50%, -120%)";

  return (
    <div
      className={`fixed z-50 shadow-xl rounded-lg p-4 max-w-xs w-full ${
        isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
      }`}
      style={{ left: `${position.x}px`, top: `${position.y}px`, border: `2px solid ${color}`, transform }}
      data-income-detail="true"
      data-component="income-detail"
    >
      {positionType === "click" && onClose && (
        <button
          onClick={onClose}
          className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
          aria-label={t.overlay.closeButton}
        >
          ✕
        </button>
      )}

      {/* Header: icon + name + amount */}
      <div className="flex items-center mb-3">
        <div className="w-8 h-8 mr-3 flex-shrink-0">
          {renderSubscriptionIcon(income.name, null, "w-full h-full")}
        </div>
        <h3 className="text-base font-bold flex-1 min-w-0 truncate">{income.name}</h3>
        <div className="ml-2 text-base font-bold text-green-400 flex-shrink-0">
          +{fmtAmount(income.amount)}
        </div>
      </div>

      {/* Details */}
      <div className={`space-y-1 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
        <div className="flex justify-between">
          <span>{t.income.dayOfMonthLabel}</span>
          <span className="font-medium">{income.dayOfMonth}</span>
        </div>
        <div className="flex justify-between">
          <span>{t.income.startDateLabel}</span>
          <span className="font-medium">
            {new Date(income.startDate).toLocaleDateString(userLocale, { year: "numeric", month: "2-digit", day: "2-digit" })}
          </span>
        </div>
        {income.endDate && (
          <div className="flex justify-between">
            <span>{t.income.endDateLabel}</span>
            <span className="font-medium">
              {new Date(income.endDate).toLocaleDateString(userLocale, { year: "numeric", month: "2-digit", day: "2-digit" })}
            </span>
          </div>
        )}
      </div>

      {/* Action buttons — only on click mode */}
      {positionType === "click" && (onEdit || onDelete) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700/30">
          {onEdit && (
            <button
              onClick={() => onEdit(income)}
              className="flex-1 px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-colors"
            >
              ✏ {t.income.editTitle}
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => {
                if (window.confirm(t.income.deleteConfirm)) onDelete(income.id);
              }}
              className="px-3 py-1.5 text-xs rounded-md border border-red-700 text-red-400 hover:bg-red-900/40 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default IncomeDetail;
