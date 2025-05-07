import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { read, utils, writeFile } from 'xlsx';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const initialMappings = {
  Description: '',
  Room: '',
  Quantity: '',
  'Claimed RCV': '',
  Age: '',
  'Comparable Link': '',
};

export function BulkImportModal({
  isOpen,
  onClose,
  claimId,
  onImportComplete,
}) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState([]);
  const [mappings, setMappings] = useState(initialMappings);
  const [dragActive, setDragActive] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  // Process the uploaded file
  const processFile = async (file) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];

    if (!validTypes.includes(file.type)) {
      toast.error('Please upload an Excel or CSV file');
      return;
    }

    setFile(file);

    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const headers = utils.sheet_to_json(worksheet, { header: 1 })[0];

      // Get first 5 rows for preview
      const previewData = utils
        .sheet_to_json(worksheet, { header: 1 })
        .slice(0, 6);
      setPreview(previewData);

      // Try to automatically map columns
      const newMappings = { ...initialMappings };
      headers.forEach((header) => {
        const headerLower = header.toLowerCase();
        if (headerLower.includes('description'))
          newMappings['Description'] = header;
        if (headerLower.includes('room')) newMappings['Room'] = header;
        if (headerLower.includes('quantity') || headerLower === 'qty')
          newMappings['Quantity'] = header;
        if (headerLower.includes('claimed') || headerLower.includes('rcv'))
          newMappings['Claimed RCV'] = header;
        if (headerLower.includes('age') || headerLower.includes('years'))
          newMappings['Age'] = header;
        if (headerLower.includes('link') || headerLower.includes('comparable'))
          newMappings['Comparable Link'] = header;
      });
      setMappings(newMappings);
    } catch (err) {
      console.error('Error processing file:', err);
      toast.error('Error processing file: ' + err.message);
      setFile(null);
      setPreview([]);
    }
  };

  // Map display names to field names
  const fieldMappings = {
    Description: 'description',
    Room: 'room',
    Quantity: 'quantity',
    'Claimed RCV': 'claimed_rcv',
    Age: 'age',
    'Comparable Link': 'comparable_link',
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await processFile(file);
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setMappings(initialMappings);
    setDragActive(false);
    onClose();
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      setLoading(true);

      const data = await file.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json(worksheet);

      // Get claim's tax rate
      const { data: claimData, error: claimError } = await supabase
        .from('claims')
        .select('default_tax_rate')
        .eq('file_number', claimId)
        .single();

      if (claimError) throw claimError;

      // Transform data based on mappings
      const items = jsonData.map((row) => ({
        claim_id: claimId,
        description: row[mappings['Description']] || '',
        room: row[mappings['Room']] || '',
        quantity: parseFloat(row[mappings['Quantity']]) || 1,
        claimed_rcv: parseFloat(row[mappings['Claimed RCV']]) || null,
        age: parseFloat(row[mappings['Age']]) || null,
        comparable_link: row[mappings['Comparable Link']] || '',
        tax_rate: claimData.default_tax_rate,
        submitted_by: 'adjuster',
      }));

      // Insert items in batches of 100
      const batchSize = 100;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const { error } = await supabase.from('items').insert(batch);

        if (error) throw error;
      }

      toast.success(`Successfully imported ${items.length} items`);
      onImportComplete();
      onClose();
    } catch (err) {
      console.error('Error importing items:', err);
      toast.error('Failed to import items: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setDownloading(true);

      // Create workbook
      const wb = utils.book_new();

      // Create template data
      const templateData = [
        [
          'Description',
          'Room',
          'Quantity',
          'Claimed RCV',
          'Age',
          'Condition',
          'Comparable Link',
        ],
        [
          'Samsung 65" TV',
          'Living Room',
          '1',
          '1299.99',
          '2',
          'good',
          'https://www.example.com/tv',
        ],
        [
          'MacBook Pro',
          'Office',
          '1',
          '2499.99',
          '1',
          'good',
          'https://www.example.com/laptop',
        ],
        ['', '', '', '', '', '', ''], // Empty row for user input
      ];

      // Create worksheet
      const ws = utils.aoa_to_sheet(templateData);

      // Add worksheet to workbook
      utils.book_append_sheet(wb, ws, 'Template');

      // Generate file and trigger download
      writeFile(wb, 'inventory-template.xlsx');
    } catch (err) {
      console.error('Error downloading template:', err);
      toast.error('Failed to download template');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title className="text-lg font-medium leading-6 text-gray-900">
                    Bulk Import Items
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Spreadsheet
                    </label>
                    <div
                      className={`flex justify-center rounded-lg border-2 border-dashed ${
                        dragActive
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-900/25'
                      } px-6 py-10 transition-colors duration-200`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <div className="text-center">
                        <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-300" />
                        <div className="mt-4 flex text-sm leading-6 text-gray-600">
                          <label className="relative cursor-pointer rounded-md bg-white font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500">
                            <span>Upload a file</span>
                            <input
                              type="file"
                              className="sr-only"
                              accept=".xlsx,.xls,.csv"
                              onChange={handleFileChange}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-xs leading-5 text-gray-600">
                            Excel or CSV files only
                          </p>
                          <button
                            type="button"
                            onClick={handleDownloadTemplate}
                            disabled={downloading}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            {downloading
                              ? 'Downloading...'
                              : 'Download Template'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column Mappings */}
                  {file && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">
                        Column Mappings
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(mappings).map(
                          ([displayName, value]) => (
                            <div key={displayName}>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                {displayName}
                              </label>
                              <select
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                value={value}
                                onChange={(e) =>
                                  setMappings((prev) => ({
                                    ...prev,
                                    [displayName]: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Select Column</option>
                                {preview[0]?.map((header, index) => (
                                  <option key={index} value={header}>
                                    {header}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Preview */}
                  {preview.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">
                        Preview (First 5 Rows)
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {preview.map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                  <td
                                    key={cellIndex}
                                    className="whitespace-nowrap px-3 py-2 text-sm text-gray-500"
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      onClick={handleClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                      onClick={handleImport}
                      disabled={!file || loading}
                    >
                      {loading ? 'Importing...' : 'Import Items'}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
