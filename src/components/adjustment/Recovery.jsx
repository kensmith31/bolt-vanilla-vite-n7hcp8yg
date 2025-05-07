import { InventoryGrid } from './InventoryGrid.jsx';

export function Recovery({ claimId }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Recovery</h2>
      <InventoryGrid claimId={claimId} mode="recovery" />
    </div>
  );
}