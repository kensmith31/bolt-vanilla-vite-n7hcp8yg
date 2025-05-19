import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useSelection } from "../../contexts/SelectionContext";
import { InventoryGrid } from "./InventoryGrid.jsx";
import { AddItemModal } from "./AddItemModal";
import { BulkEditModal } from "./BulkEditModal";
import { BulkImportModal } from "./BulkImportModal";
import { FilterModal } from "./FilterModal";
import { ReportModal } from "./ReportModal";
import { TotalsBar } from "./TotalsBar";
import {
  UserPlusIcon,
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PlusIcon,
  ArrowUpTrayIcon,
  FunnelIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { cn } from "../../lib/utils";
import toast, { Toaster } from "react-hot-toast";
import { useFilterStore } from "../../stores/filterStore";

export function AdjustmentScreen() {
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [isOffCanvasOpen, setIsOffCanvasOpen] = useState(false);
  const { fileNumber } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeParticipants, setActiveParticipants] = useState([]);
  const [activeTab, setActiveTab] = useState("inventory");
  const [isEditingTaxRate, setIsEditingTaxRate] = useState(false);
  const scrollPosition = useRef(0);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedRows, clearSelections } = useSelection();

  // Get filters and clearFilters from the filter store
  const { filters, clearFilters } = useFilterStore();

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some(
    (filter) => filter !== "" && filter !== null && filter !== undefined,
  );

  useEffect(() => {
    fetchClaim();
    fetchActiveParticipants();
  }, [fileNumber]);

  useEffect(() => {
    const path = location.pathname.split("/");
    const currentTab = path[path.length - 1];
    if (
      currentTab &&
      [
        "inventory",
        "enter-identify",
        "review-verify",
        "price-verify",
        "depreciation",
        "recovery",
      ].includes(currentTab)
    ) {
      setActiveTab(
        currentTab === "enter-identify" ? "enter_identify" : currentTab,
      );
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      scrollPosition.current = window.scrollY;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (scrollPosition.current) {
      window.scrollTo(0, scrollPosition.current);
    }
  }, [location.pathname]);

  async function fetchClaim() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("claims")
        .select("*")
        .eq("file_number", fileNumber)
        .single();

      if (error) throw error;
      setClaim(data);
    } catch (err) {
      console.error("Error fetching claim:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchActiveParticipants() {
    try {
      const { data, error } = await supabase
        .from("claim_participants")
        .select(
          `
          id,
          user_id,
          roles!inner (
            name
          ),
          last_active,
          users!claim_participants_user_id_fkey (
            first_name,
            last_name,
            email
          )
        `,
        )
        .eq("claim_id", fileNumber)
        .order("last_active", { ascending: false });

      if (error) throw error;
      setActiveParticipants(data || []);
    } catch (err) {
      console.error("Error fetching active participants:", err);
    }
  }

  const handleTaxRateUpdate = async (newRate) => {
    try {
      // Convert percentage input to decimal (e.g., 8.125 -> 0.08125)
      const numericRate = parseFloat(newRate) / 100;

      const { error: updateError } = await supabase
        .from("claims")
        .update({ default_tax_rate: numericRate })
        .eq("file_number", fileNumber);

      if (updateError) throw updateError;

      // Update local state with the precise value
      setClaim((prev) => ({ ...prev, default_tax_rate: numericRate }));

      // Refresh the inventory grid to update tax rates in the items
      refreshGrid();

      toast.success("Tax rate updated successfully");
    } catch (err) {
      console.error("Error updating tax rate:", err);
      toast.error("Failed to update tax rate");
    } finally {
      setIsEditingTaxRate(false);
    }
  };

  const handleTabChange = (tab) => {
    const tabPath = tab === "enter_identify" ? "enter-identify" : tab;
    navigate(`/claim/${fileNumber}/${tabPath}`, { replace: true });
    setActiveTab(tab);
  };

  // Enhanced function to handle bulk edit completion
  const handleBulkEditComplete = () => {
    console.log("Bulk edit completed, refreshing data...");
    refreshGrid();
    clearSelections();
  };

  // Function to refresh the grid data
  const refreshGrid = () => {
    const gridComponent = document.querySelector(
      '[data-testid="inventory-grid"]',
    );
    if (gridComponent) {
      console.log("Triggering grid refresh...");
      gridComponent.dispatchEvent(new CustomEvent("refreshData"));
    } else {
      console.error("Could not find inventory grid component");
      toast.error("Failed to refresh grid");
    }
  };

  // Function to clear filters and refresh grid
  const handleClearFilters = () => {
    clearFilters();
    toast.success("Filters cleared");
    refreshGrid();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="bg-red-50 text-red-800 p-4 rounded-lg">
        <h3 className="font-semibold">Error</h3>
        <p>{error || "Claim not found"}</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 w-[95%] mx-auto">
        <Toaster position="top-right" />
        <div className="bg-slate-700 shadow-lg rounded-lg h-12">
          <div className="flex items-center justify-between px-6 py-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 text-lg font-montserrat text-white">
                <span className="text-2xl font-bold">#{claim.file_number}</span>
                <span className="text-white/20">|</span>
                <span className="text-xl">
                  {claim.insured_first_name} {claim.insured_last_name}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOffCanvasOpen(true)}
              className="text-white/70 hover:text-white"
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Off-canvas menu */}
        <div
          className={cn(
            "fixed top-16 bottom-0 right-0 w-96 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50",
            isOffCanvasOpen
              ? "translate-x-0 rounded-l-2xl"
              : "translate-x-full",
          )}
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Claim Details</h2>
              <button
                onClick={() => setIsOffCanvasOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <ChevronRightIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Contact Information
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Email:</span> {claim.email}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Phone:</span>{" "}
                      {claim.phone_number?.replace(
                        /(\d{3})(\d{3})(\d{4})/,
                        "($1) $2-$3",
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Property
                  </h3>
                  <div className="space-y-1">
                    <p className="text-sm">{claim.property_address}</p>
                    <p className="text-sm">
                      {[
                        claim.property_city,
                        claim.property_state,
                        claim.property_zip_code,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Settings
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Default Tax Rate
                        </span>
                        {isEditingTaxRate ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              pattern="[0-9]*[.]?[0-9]*"
                              min="0"
                              max="100"
                              defaultValue={
                                claim.default_tax_rate
                                  ? (claim.default_tax_rate * 100).toFixed(3)
                                  : ""
                              }
                              className="w-20 h-6 text-sm rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-right"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleTaxRateUpdate(e.target.value);
                                } else if (e.key === "Escape") {
                                  setIsEditingTaxRate(false);
                                }
                              }}
                              autoFocus
                            />
                            <span className="text-gray-500">%</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const input =
                                  e.target.parentElement.querySelector("input");
                                handleTaxRateUpdate(input.value);
                              }}
                              className="text-xs bg-green-500 text-white px-2 py-0.5 rounded hover:bg-green-600"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setIsEditingTaxRate(false)}
                              className="text-xs bg-gray-500 text-white px-2 py-0.5 rounded hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {claim.default_tax_rate != null
                                ? `${(claim.default_tax_rate * 100).toFixed(3)}%`
                                : "Not set"}
                            </span>
                            <button
                              onClick={() => setIsEditingTaxRate(true)}
                              className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded hover:bg-blue-600"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Depreciation
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const { error } = await supabase
                                  .from("claims")
                                  .update({
                                    depreciation_applicable:
                                      !claim.depreciation_applicable,
                                    depreciation_recoverable:
                                      claim.depreciation_applicable
                                        ? false
                                        : claim.depreciation_recoverable,
                                  })
                                  .eq("file_number", fileNumber);

                                if (error) throw error;

                                setClaim((prev) => ({
                                  ...prev,
                                  depreciation_applicable:
                                    !prev.depreciation_applicable,
                                  depreciation_recoverable:
                                    prev.depreciation_applicable
                                      ? false
                                      : prev.depreciation_recoverable,
                                }));

                                toast.success("Depreciation setting updated");
                              } catch (err) {
                                console.error(
                                  "Error updating depreciation setting:",
                                  err,
                                );
                                toast.error(
                                  "Failed to update depreciation setting",
                                );
                              }
                            }}
                            className={`px-2 py-1 text-xs font-semibold rounded ${
                              claim.depreciation_applicable
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-red-100 text-red-800 hover:bg-red-200"
                            }`}
                          >
                            {claim.depreciation_applicable
                              ? "Applicable"
                              : "Not Applicable"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {claim.depreciation_applicable && (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Recovery Tab
                          </span>
                          <button
                            onClick={async () => {
                              try {
                                const { error } = await supabase
                                  .from("claims")
                                  .update({
                                    depreciation_recoverable:
                                      !claim.depreciation_recoverable,
                                  })
                                  .eq("file_number", fileNumber);

                                if (error) throw error;

                                setClaim((prev) => ({
                                  ...prev,
                                  depreciation_recoverable:
                                    !prev.depreciation_recoverable,
                                }));

                                toast.success("Recovery setting updated");
                              } catch (err) {
                                console.error(
                                  "Error updating recovery setting:",
                                  err,
                                );
                                toast.error(
                                  "Failed to update recovery setting",
                                );
                              }
                            }}
                            className={`px-2 py-1 text-xs font-semibold rounded ${
                              claim.depreciation_recoverable
                                ? "bg-purple-100 text-purple-800 hover:bg-purple-200"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {claim.depreciation_recoverable
                              ? "Enabled"
                              : "Disabled"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Active Users
                  </h3>
                  <div className="space-y-2">
                    {activeParticipants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>
                          {participant.users.first_name}{" "}
                          {participant.users.last_name}
                        </span>
                        <span className="text-gray-500">
                          {participant.roles.name.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                    <button className="w-full mt-2 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center gap-1.5">
                      <UserPlusIcon className="h-4 w-4" />
                      Add Participant
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg w-full h-10 flex items-center px-4">
          <div className="flex items-center justify-between w-full gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative">
                <input
                  type="number"
                  placeholder="Enter #"
                  className="w-24 pl-3 pr-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      setSearchQuery("");
                      setSearchQuery(`#${value}`);
                    } else {
                      setSearchQuery("");
                    }
                  }}
                />
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!value.startsWith("#")) {
                      const itemNumInput = document.querySelector(
                        'input[type="number"]',
                      );
                      if (itemNumInput) itemNumInput.value = "";
                    }
                    setSearchQuery(value);
                  }}
                  placeholder="Search any field..."
                  className="w-64 pl-9 pr-4 py-1 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <MagnifyingGlassIcon className="absolute left-2.5 top-1.5 h-5 w-5 text-gray-400" />
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <XCircleIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {selectedRows.size > 0 && (
                <button
                  onClick={clearSelections}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex items-center gap-1.5"
                >
                  Clear Selection ({selectedRows.size})
                </button>
              )}
              {selectedRows.size > 0 && (
                <button
                  onClick={() => setIsBulkEditModalOpen(true)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-1.5"
                >
                  Edit Selected ({selectedRows.size})
                </button>
              )}

              {/* Updated Filter Button with Indicator */}
              <button
                onClick={() => setIsFilterModalOpen(true)}
                className={cn(
                  "px-3 py-1 text-sm rounded-md flex items-center gap-1.5",
                  hasActiveFilters
                    ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                )}
              >
                <FunnelIcon className="h-4 w-4" />
                {hasActiveFilters ? "Filters Active" : "Filter"}
              </button>

              {/* Add Clear Filters button when filters are active */}
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex items-center gap-1.5"
                >
                  <XCircleIcon className="h-4 w-4" />
                  Clear Filters
                </button>
              )}

              <button
                onClick={() => setIsBulkImportModalOpen(true)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-1.5"
              >
                <ArrowUpTrayIcon className="h-4 w-4" />
                Import
              </button>

              <button
                onClick={() => setIsAddItemModalOpen(true)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <PlusIcon className="h-4 w-4" />
                Add
              </button>
            </div>
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 flex items-center gap-1.5"
            >
              <DocumentTextIcon className="h-4 w-4" />
              Reports
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg w-full flex flex-col overflow-hidden">
          <div className="sticky top-0 z-20 bg-white border-b border-gray-200 rounded-t-lg">
            <nav
              className="flex justify-between px-6 border-b border-gray-200 h-8"
              aria-label="Tabs"
            >
              <button
                onClick={() => handleTabChange("inventory")}
                className={cn(
                  "whitespace-nowrap h-8 px-6 border-b text-sm font-medium flex-1 text-center transition-colors relative",
                  activeTab === "inventory"
                    ? "border-blue-600 text-blue-700 bg-blue-50 font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/80",
                )}
              >
                Inventory
                {activeTab === "inventory" && (
                  <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
              <button
                onClick={() => handleTabChange("enter_identify")}
                className={cn(
                  "whitespace-nowrap h-8 px-6 border-b text-sm font-medium flex-1 text-center transition-colors",
                  activeTab === "enter_identify"
                    ? "border-blue-600 text-blue-600 bg-blue-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50",
                )}
              >
                Enter & Identify
              </button>
              <button
                onClick={() => handleTabChange("review_verify")}
                className={cn(
                  "whitespace-nowrap h-8 px-6 border-b text-sm font-medium flex-1 text-center transition-colors",
                  activeTab === "review_verify"
                    ? "border-blue-600 text-blue-600 bg-blue-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50",
                )}
              >
                Review & Verify
              </button>
              <button
                onClick={() => handleTabChange("price_verify")}
                className={cn(
                  "whitespace-nowrap h-8 px-6 border-b text-sm font-medium flex-1 text-center transition-colors",
                  activeTab === "price_verify"
                    ? "border-blue-600 text-blue-600 bg-blue-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50",
                )}
              >
                Pricing
              </button>
              {claim.depreciation_applicable && (
                <button
                  onClick={() => handleTabChange("depreciation")}
                  className={cn(
                    "whitespace-nowrap h-8 px-6 border-b text-sm font-medium flex-1 text-center transition-colors",
                    activeTab === "depreciation"
                      ? "border-blue-600 text-blue-600 bg-blue-50/50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50",
                  )}
                >
                  Depreciation
                </button>
              )}
              {claim.depreciation_recoverable && (
                <button
                  onClick={() => handleTabChange("recovery")}
                  className={cn(
                    "whitespace-nowrap h-8 px-6 border-b text-sm font-medium flex-1 text-center transition-colors",
                    activeTab === "recovery"
                      ? "border-blue-600 text-blue-600 bg-blue-50/50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50",
                  )}
                >
                  Recovery
                </button>
              )}
            </nav>
          </div>
          <div
            className={cn(
              "overflow-hidden rounded-b-lg transition-all duration-300 ease-in-out",
              isHeaderCollapsed ? "h-[calc(90vh-7rem)]" : "h-[calc(90vh-7rem)]",
            )}
          >
            <div className="h-full inventory-grid flex flex-col">
              <InventoryGrid
                claimId={fileNumber}
                mode={activeTab}
                searchQuery={searchQuery}
                className="inventory-grid flex-1"
              />
            </div>
          </div>
          <TotalsBar claimId={fileNumber} />
        </div>
        <AddItemModal
          isOpen={isAddItemModalOpen}
          onClose={() => setIsAddItemModalOpen(false)}
          claimId={fileNumber}
          onItemAdded={() => {
            refreshGrid();
          }}
        />
        <BulkEditModal
          isOpen={isBulkEditModalOpen}
          onClose={() => setIsBulkEditModalOpen(false)}
          selectedItems={selectedRows}
          onUpdate={handleBulkEditComplete}
        />
        <BulkImportModal
          isOpen={isBulkImportModalOpen}
          onClose={() => setIsBulkImportModalOpen(false)}
          claimId={fileNumber}
          onImportComplete={() => {
            refreshGrid();
            toast.success("Items imported successfully");
          }}
        />
        <FilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          claimId={fileNumber}
        />
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          claimId={fileNumber}
        />
      </div>
    </>
  );
}
