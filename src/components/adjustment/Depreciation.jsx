import { InventoryGrid } from './InventoryGrid.jsx';

export function Depreciation({ claimId }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Depreciation</h2>
      <InventoryGrid claimId={claimId} mode="depreciation" />
    </div>
  );
}