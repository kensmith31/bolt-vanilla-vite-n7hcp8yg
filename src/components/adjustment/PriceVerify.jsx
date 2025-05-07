import { InventoryGrid } from './InventoryGrid.jsx';

export function PriceVerify({ claimId }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Price & Verify</h2>
      <InventoryGrid claimId={claimId} mode="price_verify" />
    </div>
  );
}