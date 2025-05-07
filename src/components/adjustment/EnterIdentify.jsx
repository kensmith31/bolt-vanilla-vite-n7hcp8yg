import { InventoryGrid } from './InventoryGrid.jsx';

export function EnterIdentify({ claimId }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Enter & Identify</h2>
      <InventoryGrid claimId={claimId} mode="enter_identify" />
    </div>
  );
}