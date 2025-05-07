import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

export function TotalsBar({ claimId }) {
  const [totals, setTotals] = useState({
    itemCount: 0,
    statusCounts: {
      submitted: 0,
      in_review: 0,
      priced: 0,
      adjusted: 0,
      holdback_paid: 0
    },
    rcvTotal: 0,
    taxTotal: 0,
    depreciationTotal: 0,
    acvTotal: 0,
    replacedTotal: 0,
    holdbackTotal: 0
  });

  const fetchTotals = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('claim_id', claimId);

      if (error) throw error;

      // Calculate status counts
      const statusCounts = data.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});

      const calculatedTotals = data.reduce((acc, item) => ({
        itemCount: acc.itemCount + 1,
        statusCounts,
        rcvTotal: acc.rcvTotal + (item.rcv_total || 0),
        taxTotal: acc.taxTotal + (item.tax_amount || 0),
        depreciationTotal: acc.depreciationTotal + (item.depreciation_amount || 0),
        acvTotal: acc.acvTotal + (item.acv || 0),
        replacedTotal: acc.replacedTotal + (item.replacement_spent || 0),
        holdbackTotal: acc.holdbackTotal + (item.holdback_due || 0)
      }), {
        itemCount: 0,
        statusCounts,
        rcvTotal: 0,
        taxTotal: 0,
        depreciationTotal: 0,
        acvTotal: 0,
        replacedTotal: 0,
        holdbackTotal: 0
      });

      setTotals(calculatedTotals);
    } catch (err) {
      console.error('Error fetching totals:', err);
    }
  }, [claimId]);

  useEffect(() => {
    fetchTotals();

    // Subscribe to all changes on the items table for this claim
    const channel = supabase
      .channel('items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `claim_id=eq.${claimId}`
        },
        async () => {
          await fetchTotals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [claimId, fetchTotals]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const getStatusBadgeStyle = (status) => {
    const styles = {
      submitted: 'bg-red-100 text-red-800',
      in_review: 'bg-yellow-100 text-yellow-800',
      priced: 'bg-green-100 text-green-800',
      adjusted: 'bg-blue-100 text-blue-800',
      holdback_paid: 'bg-purple-100 text-purple-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="border-t border-gray-200 bg-gray-50 p-4">
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 mr-2">Items:</span>
            <span className="font-medium">{totals.itemCount}</span>
          </div>
          {Object.entries(totals.statusCounts).map(([status, count]) => count > 0 && (
            <span
              key={status}
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                getStatusBadgeStyle(status)
              )}
            >
              {count} {status.replace('_', ' ')}
            </span>
          ))}
          <div>
            <span className="text-gray-500 mr-2">Total RCV:</span>
            <span className="font-medium">{formatCurrency(totals.rcvTotal)}</span>
          </div>
          <div>
            <span className="text-gray-500 mr-2">Total Tax:</span>
            <span className="font-medium">{formatCurrency(totals.taxTotal)}</span>
          </div>
          <div>
            <span className="text-gray-500 mr-2">Total Depreciation:</span>
            <span className="font-medium">{formatCurrency(totals.depreciationTotal)}</span>
          </div>
          <div>
            <span className="text-gray-500 mr-2">Total ACV:</span>
            <span className="font-medium">{formatCurrency(totals.acvTotal)}</span>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div>
            <span className="text-gray-500 mr-2">Replaced:</span>
            <span className="font-medium">{formatCurrency(totals.replacedTotal)}</span>
          </div>
          <div>
            <span className="text-gray-500 mr-2">Holdback Due:</span>
            <span className="font-medium">{formatCurrency(totals.holdbackTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}