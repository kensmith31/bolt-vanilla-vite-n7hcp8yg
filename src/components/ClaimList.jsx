import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  PlusIcon,
  PencilIcon,
  UserPlusIcon,
  UserMinusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import toast, { Toaster } from "react-hot-toast";
import { Link } from "react-router-dom";
import { ClaimItems } from "./ClaimItems";

export function ClaimList() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [expandedClaim, setExpandedClaim] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [formData, setFormData] = useState({
    file_number: "",
    insured_name: "",
    phone_number: "",
    email: "",
    property_address: "",
    property_zip_code: "",
    default_tax_rate: "",
    depreciation_applicable: true,
    depreciation_recoverable: true,
  });

  useEffect(() => {
    fetchCurrentUser();
    fetchClaims();
    fetchUsers();
  }, []);

  async function fetchCurrentUser() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;
      setCurrentUser(userData);
    } catch (err) {
      console.error("Error fetching current user:", err);
      toast.error("Failed to load user data");
    }
  }

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          `
          id,
          first_name,
          last_name,
          email,
          roles (
            name
          )
        `,
        )
        .filter("roles.name", "in", "(desk_adjuster,field_adjuster,admin)");

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("Failed to load users");
    }
  }

  async function fetchClaimParticipants(claim) {
    try {
      const { data: participants, error: participantsError } = await supabase
        .from("claim_participants")
        .select(
          `
          id,
          user_id,
          roles (
            name
          ),
          users!claim_participants_user_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `,
        )
        .eq("claim_id", claim.file_number);

      if (participantsError) {
        console.error("Error fetching participants:", participantsError);
        return [];
      }

      return participants || [];
    } catch (err) {
      console.error("Error fetching claim participants:", err);
      return [];
    }
  }

  async function fetchClaims() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Authentication required");
        return;
      }

      const { data: claimsData, error: claimsError } = await supabase
        .from("claims")
        .select("*")
        .order("date_created", { ascending: false });

      if (claimsError) throw claimsError;

      // Fetch participants for each claim
      const claimsWithParticipants = await Promise.all(
        claimsData.map(async (claim) => {
          const participants = await fetchClaimParticipants(claim);
          return {
            ...claim,
            claim_participants: participants,
          };
        }),
      );

      setClaims(claimsWithParticipants || []);
    } catch (err) {
      console.error("Error fetching claims:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (claim) => {
    setEditingClaim(claim);
    setFormData({
      file_number: claim.file_number,
      insured_name: claim.insured_name,
      phone_number: claim.phone_number || "",
      email: claim.email || "",
      property_address: claim.property_address || "",
      property_zip_code: claim.property_zip_code || "",
      default_tax_rate: claim.default_tax_rate || "",
      depreciation_applicable: claim.depreciation_applicable,
      depreciation_recoverable: claim.depreciation_recoverable,
      status: claim.status,
    });
    setIsModalOpen(true);
  };

  const handleParticipantAdd = (claim) => {
    setEditingClaim(claim);
    setIsParticipantModalOpen(true);
  };

  const handleAddParticipant = async (e) => {
    e.preventDefault();

    try {
      if (!selectedParticipant) {
        toast.error("Please select a participant");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Get the selected user's role
      const selectedUser = users.find((u) => u.id === selectedParticipant);
      if (!selectedUser) {
        throw new Error("Selected user not found");
      }

      // Check if the participant is already assigned to this claim
      const { data: existingParticipant, error: checkError } = await supabase
        .from("claim_participants")
        .select("id")
        .eq("claim_id", editingClaim.file_number)
        .eq("user_id", selectedParticipant)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingParticipant) {
        toast.error("This participant is already assigned to the claim");
        return;
      }

      const { error: insertError } = await supabase
        .from("claim_participants")
        .insert({
          claim_id: editingClaim.file_number,
          user_id: selectedParticipant,
          role_id: selectedUser.roles.id,
          added_by: user.id,
        });

      if (insertError) {
        // Handle unique constraint violation
        if (insertError.code === "23505") {
          toast.error("This participant is already assigned to the claim");
          return;
        }
        throw insertError;
      }

      // Fetch updated participants for this claim
      const updatedParticipants = await fetchClaimParticipants(editingClaim);

      // Update the claims state with new participant data
      setClaims((prevClaims) =>
        prevClaims.map((claim) =>
          claim.file_number === editingClaim.file_number
            ? { ...claim, claim_participants: updatedParticipants }
            : claim,
        ),
      );

      toast.success("Participant added successfully");
      setIsParticipantModalOpen(false);
      setSelectedParticipant("");
    } catch (err) {
      console.error("Error adding participant:", err);
      toast.error("Failed to add participant: " + err.message);
    }
  };

  const handleRemoveParticipant = async (claimId, participantId) => {
    try {
      const { error } = await supabase
        .from("claim_participants")
        .delete()
        .eq("id", participantId);

      if (error) throw error;

      // Update the claims state by removing the deleted participant
      setClaims((prevClaims) =>
        prevClaims.map((claim) =>
          claim.file_number === claimId
            ? {
                ...claim,
                claim_participants: claim.claim_participants.filter(
                  (p) => p.id !== participantId,
                ),
              }
            : claim,
        ),
      );

      toast.success("Participant removed successfully");
    } catch (err) {
      console.error("Error removing participant:", err);
      toast.error("Failed to remove participant: " + err.message);
    }
  };

  const handleDeleteClaim = async () => {
    try {
      // Check if user has permission to delete claims
      if (
        !currentUser ||
        !["admin", "desk_adjuster"].includes(currentUser.roles?.name)
      ) {
        throw new Error("You do not have permission to delete claims");
      }

      if (!claimToDelete) {
        throw new Error("No claim selected for deletion");
      }

      // First, check if there are any items associated with this claim
      const { data: items, error: itemsError } = await supabase
        .from("items")
        .select("id")
        .eq("claim_id", claimToDelete.file_number)
        .limit(1);

      if (itemsError) throw itemsError;

      if (items && items.length > 0) {
        throw new Error(
          "Cannot delete claim with existing items. Please delete all items first.",
        );
      }

      // Delete claim participants first
      const { error: participantsError } = await supabase
        .from("claim_participants")
        .delete()
        .eq("claim_id", claimToDelete.file_number);

      if (participantsError) throw participantsError;

      // Delete the claim
      const { error: deleteError } = await supabase
        .from("claims")
        .delete()
        .eq("file_number", claimToDelete.file_number);

      if (deleteError) throw deleteError;

      // Update the claims state by removing the deleted claim
      setClaims((prevClaims) =>
        prevClaims.filter(
          (claim) => claim.file_number !== claimToDelete.file_number,
        ),
      );

      toast.success("Claim deleted successfully");
      setIsDeleteModalOpen(false);
      setClaimToDelete(null);
    } catch (err) {
      console.error("Error deleting claim:", err);
      toast.error(`Failed to delete claim: ${err.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Check if user has permission to create/edit claims
      if (
        !currentUser ||
        !["admin", "desk_adjuster", "field_adjuster"].includes(
          currentUser.roles?.name,
        )
      ) {
        throw new Error("You do not have permission to perform this action");
      }

      if (editingClaim) {
        // Update existing claim
        const { error } = await supabase
          .from("claims")
          .update({
            insured_name: formData.insured_name,
            phone_number: formData.phone_number,
            email: formData.email,
            property_address: formData.property_address,
            property_zip_code: formData.property_zip_code,
            default_tax_rate: formData.default_tax_rate
              ? parseFloat(formData.default_tax_rate)
              : null,
            depreciation_applicable: formData.depreciation_applicable,
            depreciation_recoverable: formData.depreciation_recoverable,
            status: formData.status,
            date_updated: new Date().toISOString(),
          })
          .eq("file_number", editingClaim.file_number);

        if (error) throw error;
        toast.success("Claim updated successfully");
      } else {
        // Create new claim
        const newClaim = {
          ...formData,
          created_by: currentUser.id,
          status: "active",
          default_tax_rate: formData.default_tax_rate
            ? parseFloat(formData.default_tax_rate)
            : null,
        };

        const { error: claimError } = await supabase
          .from("claims")
          .insert([newClaim]);

        if (claimError) throw claimError;

        toast.success("Claim created successfully");
      }

      setIsModalOpen(false);
      fetchClaims(); // Refresh the claims list

      // Reset form
      setFormData({
        file_number: "",
        insured_name: "",
        phone_number: "",
        email: "",
        property_address: "",
        property_zip_code: "",
        default_tax_rate: "",
        depreciation_applicable: true,
        depreciation_recoverable: true,
      });
      setEditingClaim(null);
    } catch (err) {
      console.error("Error saving claim:", err);
      toast.error(
        `Failed to ${editingClaim ? "update" : "create"} claim: ${err.message}`,
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-800 p-4 rounded-lg">
        <h3 className="font-semibold">Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  // Only show create button for staff roles
  const canCreateClaim =
    currentUser &&
    ["admin", "desk_adjuster", "field_adjuster"].includes(currentUser.role);

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <Toaster position="top-right" />
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Claims</h3>
        {canCreateClaim && (
          <button
            onClick={() => {
              setEditingClaim(null);
              setFormData({
                file_number: "",
                insured_name: "",
                phone_number: "",
                email: "",
                property_address: "",
                property_zip_code: "",
                default_tax_rate: "",
                depreciation_applicable: true,
                depreciation_recoverable: true,
              });
              setIsModalOpen(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Create Claim
          </button>
        )}
      </div>
      <div className="border-t border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Claim
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Insured Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Participants
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Created At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {claims.map((claim) => (
                <tr key={claim.file_number} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      to={`/claim/${claim.file_number}`}
                      className="inline-block px-6 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <span className="text-xl font-bold text-blue-700">
                        #{claim.file_number}
                      </span>
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="text-lg font-bold text-gray-500">
                      {claim.insured_first_name} {claim.insured_last_name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        claim.status === "active"
                          ? "bg-green-100 text-green-800"
                          : claim.status === "under_review"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {claim.status?.replace("_", " ").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex flex-col gap-1">
                      {claim.claim_participants?.map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center gap-2"
                        >
                          <span>
                            {participant.users.first_name}{" "}
                            {participant.users.last_name}
                            <span className="text-xs text-gray-500 ml-1">
                              (
                              {participant.roles && participant.roles.name
                                ? participant.roles.name.replace("_", " ")
                                : "No Role"}
                              )
                            </span>
                          </span>
                          <button
                            onClick={() =>
                              handleRemoveParticipant(
                                claim.file_number,
                                participant.id,
                              )
                            }
                            className="text-red-600 hover:text-red-900"
                          >
                            <UserMinusIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => handleParticipantAdd(claim)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1 text-sm"
                      >
                        <UserPlusIcon className="h-4 w-4" />
                        Add Participant
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(claim.date_created).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Claim Modal */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setIsModalOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 mb-4"
                  >
                    {editingClaim ? "Edit Claim" : "Create New Claim"}
                  </Dialog.Title>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {!editingClaim && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          File Number
                        </label>
                        <input
                          type="text"
                          required
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          value={formData.file_number}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              file_number: e.target.value,
                            })
                          }
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Insured Name
                      </label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={formData.insured_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            insured_name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={formData.phone_number}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            phone_number: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input
                        type="email"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Property Address
                      </label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={formData.property_address}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            property_address: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Property ZIP Code
                      </label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={formData.property_zip_code}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            property_zip_code: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Default Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={formData.default_tax_rate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            default_tax_rate: e.target.value,
                          })
                        }
                      />
                    </div>
                    {editingClaim && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Status
                        </label>
                        <select
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          value={formData.status}
                          onChange={(e) =>
                            setFormData({ ...formData, status: e.target.value })
                          }
                        >
                          <option value="active">Active</option>
                          <option value="under_review">Under Review</option>
                          <option value="complete">Complete</option>
                        </select>
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="depreciation_applicable"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={formData.depreciation_applicable}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              depreciation_applicable: e.target.checked,
                            })
                          }
                        />
                        <label
                          htmlFor="depreciation_applicable"
                          className="ml-2 block text-sm text-gray-700"
                        >
                          Depreciation Applicable
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="depreciation_recoverable"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={formData.depreciation_recoverable}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              depreciation_recoverable: e.target.checked,
                            })
                          }
                        />
                        <label
                          htmlFor="depreciation_recoverable"
                          className="ml-2 block text-sm text-gray-700"
                        >
                          Depreciation Recoverable
                        </label>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                        onClick={() => {
                          setIsModalOpen(false);
                          setEditingClaim(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                      >
                        {editingClaim ? "Update Claim" : "Create Claim"}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Participant Modal */}
      <Transition appear show={isParticipantModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setIsParticipantModalOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 mb-4"
                  >
                    Add Participant to Claim
                  </Dialog.Title>
                  <form onSubmit={handleAddParticipant} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Participant
                      </label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={selectedParticipant}
                        onChange={(e) => setSelectedParticipant(e.target.value)}
                        required
                      >
                        <option value="">Select a participant</option>
                        {users
                          .filter(
                            (user) =>
                              !editingClaim?.claim_participants?.some(
                                (participant) =>
                                  participant.user_id === user.id,
                              ),
                          )
                          .map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.first_name} {user.last_name} ({user.email})
                              -{" "}
                              {user.roles && user.roles.name
                                ? user.roles.name.replace("_", " ")
                                : "No Role"}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                        onClick={() => setIsParticipantModalOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                      >
                        Add Participant
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
