import { InventoryGrid } from './InventoryGrid.jsx';

export function Inventory({ claimId }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Inventory</h2>
      <InventoryGrid claimId={claimId} mode="inventory" />
    </div>
  );
}