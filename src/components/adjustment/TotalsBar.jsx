import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";

export function TotalsBar({ claimId }) {
  const [totals, setTotals] = useState({
    itemCount: 0,
    statusCounts: {
      submitted: 0,
      in_review: 0,
      priced: 0,
      adjusted: 0,
      holdback_paid: 0,
    },
    rcvTotal: 0,
    taxTotal: 0,
    rcvPlusTaxTotal: 0,
    depreciationTotal: 0,
    acvTotal: 0,
    adjustedRcvTotal: 0,
    replacedTotal: 0,
    holdbackTotal: 0,
  });

  const fetchTotals = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("claim_id", claimId);

      if (error) throw error;

      // Calculate status counts
      const statusCounts = data.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});

      const calculatedTotals = data.reduce(
        (acc, item) => {
          // Calculate RCV based on flags
          let rcvValue = 0;
          if (
            item.no_loss_or_damage ||
            item.not_involved_in_claim ||
            item.duplicate_item
          ) {
            rcvValue = 0;
          } else if (item.cleaning_allowance) {
            rcvValue = item.cleaning_allowance_amount || 0;
          } else {
            rcvValue = item.rcv_total || 0;
          }

          // Calculate RCV + Tax using the adjusted RCV value
          const rcvPlusTax = rcvValue + (item.tax_amount || 0);

          // Calculate adjusted RCV for backward compatibility
          let adjustedRcv = 0;
          if (
            item.no_loss_or_damage ||
            item.not_involved_in_claim ||
            item.duplicate_item
          ) {
            adjustedRcv = 0;
          } else if (item.cleaning_allowance) {
            adjustedRcv = item.cleaning_allowance_amount || 0;
          } else {
            adjustedRcv = item.adjusted_rcv || 0;
          }

          return {
            itemCount: acc.itemCount + 1,
            statusCounts,
            rcvTotal: acc.rcvTotal + rcvValue,
            taxTotal: acc.taxTotal + (item.tax_amount || 0),
            rcvPlusTaxTotal: acc.rcvPlusTaxTotal + rcvPlusTax,
            depreciationTotal:
              acc.depreciationTotal + (item.depreciation_amount || 0),
            acvTotal: acc.acvTotal + (item.acv || 0),
            adjustedRcvTotal: acc.adjustedRcvTotal + adjustedRcv,
            replacedTotal: acc.replacedTotal + (item.replacement_spent || 0),
            holdbackTotal: acc.holdbackTotal + (item.holdback_due || 0),
          };
        },
        {
          itemCount: 0,
          statusCounts,
          rcvTotal: 0,
          taxTotal: 0,
          rcvPlusTaxTotal: 0,
          depreciationTotal: 0,
          acvTotal: 0,
          adjustedRcvTotal: 0,
          replacedTotal: 0,
          holdbackTotal: 0,
        },
      );

      setTotals(calculatedTotals);
    } catch (err) {
      console.error("Error fetching totals:", err);
    }
  }, [claimId]);

  useEffect(() => {
    fetchTotals();

    // Subscribe to all changes on the items table for this claim
    const channel = supabase
      .channel("items_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "items",
          filter: `claim_id=eq.${claimId}`,
        },
        async () => {
          await fetchTotals();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [claimId, fetchTotals]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const getStatusBadgeStyle = (status) => {
    const styles = {
      submitted: "bg-red-100 text-red-800",
      in_review: "bg-yellow-100 text-yellow-800",
      priced: "bg-green-100 text-green-800",
      adjusted: "bg-blue-100 text-blue-800",
      holdback_paid: "bg-purple-100 text-purple-800",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="border-t border-gray-200 bg-blue-50 p-2 fixed bottom-0 left-0 right-0 shadow-lg z-40">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-gray-700 font-semibold text-sm">
              Total Items:
            </span>
            <span className="font-bold">{totals.itemCount}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(totals.statusCounts).map(
              ([status, count]) =>
                count > 0 && (
                  <span
                    key={status}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      getStatusBadgeStyle(status),
                    )}
                  >
                    {count} {status.replace("_", " ")}
                  </span>
                ),
            )}
          </div>
        </div>

        <div className="flex flex-row flex-wrap md:flex-nowrap gap-1 text-xs">
          <div className="bg-white p-1.5 rounded-md shadow-sm flex-1 min-w-0">
            <span className="text-gray-500 block text-xs">RCV Total:</span>
            <span className="font-bold text-sm">
              {formatCurrency(totals.rcvTotal)}
            </span>
          </div>
          <div className="bg-white p-1.5 rounded-md shadow-sm flex-1 min-w-0">
            <span className="text-gray-500 block text-xs">Total Tax:</span>
            <span className="font-bold text-sm">
              {formatCurrency(totals.taxTotal)}
            </span>
          </div>
          <div className="bg-white p-1.5 rounded-md shadow-sm flex-1 min-w-0">
            <span className="text-gray-500 block text-xs">RCV + Tax:</span>
            <span className="font-bold text-sm">
              {formatCurrency(totals.rcvPlusTaxTotal)}
            </span>
          </div>
          <div className="bg-white p-1.5 rounded-md shadow-sm flex-1 min-w-0">
            <span className="text-gray-500 block text-xs">Dep Amt:</span>
            <span className="font-bold text-sm">
              {formatCurrency(totals.depreciationTotal)}
            </span>
          </div>
          <div className="bg-white p-1.5 rounded-md shadow-sm flex-1 min-w-0">
            <span className="text-gray-500 block text-xs">ACV:</span>
            <span className="font-bold text-sm">
              {formatCurrency(totals.acvTotal)}
            </span>
          </div>
          <div className="bg-white p-1.5 rounded-md shadow-sm flex-1 min-w-0">
            <span className="text-gray-500 block text-xs">Replaced:</span>
            <span className="font-bold text-sm">
              {formatCurrency(totals.replacedTotal)}
            </span>
          </div>
          <div className="bg-white p-1.5 rounded-md shadow-sm flex-1 min-w-0">
            <span className="text-gray-500 block text-xs">Holdback Due:</span>
            <span className="font-bold text-sm">
              {formatCurrency(totals.holdbackTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
