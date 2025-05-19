import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";
import {
  XMarkIcon,
  DocumentTextIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// No need to manually extend - jspdf-autotable does this automatically when imported

export function ReportModal({ isOpen, onClose, claimId }) {
  const [reportType, setReportType] = useState("summary");

  // Function to handle report type change
  const handleReportTypeChange = (type) => {
    // Clear filters and grouping when switching away from custom report
    if (reportType === "custom" && type !== "custom") {
      setFilterOption("");
      setFilterValue("");
      setGroupByOption("");
    }
    setReportType(type);
  };
  const [items, setItems] = useState([]);
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([
    "item_number",
    "description",
    "room",
    "category",
    "quantity",
    "claimed_rcv",
    "adjusted_rcv",
    "rcv_total",
    "tax_rate",
    "rcv_plus_tax",
    "depreciation_percent",
    "depreciation_amount",
    "acv",
  ]);
  const [filterOption, setFilterOption] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [groupByOption, setGroupByOption] = useState("");
  const [uniqueFilterValues, setUniqueFilterValues] = useState([]);

  const availableColumns = [
    { key: "item_number", label: "#" },
    { key: "description", label: "Description" },
    { key: "room", label: "Room" },
    { key: "quantity", label: "Qty." },
    { key: "claimed_rcv", label: "Claimed RCV" },
    { key: "adjusted_rcv", label: "Adjusted RCV" },
    { key: "rcv_total", label: "RCV Total" },
    { key: "tax_rate", label: "Tax Rate" },
    { key: "tax_amount", label: "Tax Amt." },
    { key: "rcv_plus_tax", label: "RCV + Tax" },
    { key: "age", label: "Age" },
    { key: "condition", label: "Condition" },
    { key: "depreciation_percent", label: "Dep. %" },
    { key: "depreciation_amount", label: "Dep. Amt." },
    { key: "acv", label: "ACV" },
    { key: "replacement_cost_applies", label: "RC Applies" },
    { key: "replaced", label: "Replaced" },
    { key: "replacement_spent", label: "Amt. Spent" },
    { key: "holdback_due", label: "Holdback Due" },
    { key: "comparable_link", label: "Comparable Link" },
    { key: "status", label: "Status" },
    { key: "category", label: "Category" },
  ];

  const reportTypes = [
    { id: "summary", name: "Summary Report" },
    { id: "detailed", name: "Detailed Report" },
    { id: "custom", name: "Custom Report" },
  ];

  useEffect(() => {
    if (isOpen && claimId) {
      fetchData();
    }
  }, [isOpen, claimId]);

  // Update unique filter values when filter option changes
  useEffect(() => {
    if (!filterOption || items.length === 0) {
      setUniqueFilterValues([]);
      return;
    }

    // Get unique values for the selected filter option
    const uniqueValues = new Set();

    items.forEach((item) => {
      let value;

      if (filterOption === "category") {
        const category = categories.find((c) => c.id === item.category_id);
        value = category ? category.name : "-";
      } else if (filterOption === "tax_rate") {
        value = item.tax_rate !== null ? formatTaxRate(item.tax_rate) : "-";
      } else if (
        filterOption === "replacement_cost_applies" ||
        filterOption === "replaced"
      ) {
        value = item[filterOption] ? "Yes" : "No";
      } else {
        value = item[filterOption] || "-";
      }

      uniqueValues.add(value);
    });

    setUniqueFilterValues(Array.from(uniqueValues).sort());
  }, [filterOption, items, categories]);

  // Sort items by item_number when data is loaded
  useEffect(() => {
    const sortItems = (unsortedItems) => {
      if (!unsortedItems || unsortedItems.length === 0) return unsortedItems;

      return [...unsortedItems].sort((a, b) => {
        // Handle cases where item_number might be null or undefined
        if (!a.item_number && !b.item_number) return 0;
        if (!a.item_number) return 1;
        if (!b.item_number) return -1;

        // Convert item numbers to integers if possible
        const aNum = parseInt(a.item_number.toString().split(".")[0]);
        const bNum = parseInt(b.item_number.toString().split(".")[0]);

        if (isNaN(aNum) && isNaN(bNum)) return 0;
        if (isNaN(aNum)) return 1;
        if (isNaN(bNum)) return -1;

        return aNum - bNum;
      });
    };

    // Apply sorting when items are loaded or changed
    if (items.length > 0) {
      const sortedItems = sortItems(items);
      if (JSON.stringify(sortedItems) !== JSON.stringify(items)) {
        setItems(sortedItems);
      }
    }
  }, [items.length]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch claim data
      const { data: claimData, error: claimError } = await supabase
        .from("claims")
        .select("*")
        .eq("file_number", claimId)
        .single();

      if (claimError) throw claimError;
      setClaim(claimData);

      // Fetch items data and sort by item_number
      const { data: itemsData, error: itemsError } = await supabase
        .from("items")
        .select("*")
        .eq("claim_id", claimId)
        .order("item_number", { ascending: true });

      if (itemsError) throw itemsError;

      // Sort items by numeric value of item_number
      const sortedItems = (itemsData || []).sort((a, b) => {
        // Handle cases where item_number might be null or undefined
        if (!a.item_number && !b.item_number) return 0;
        if (!a.item_number) return 1;
        if (!b.item_number) return -1;

        // Convert item numbers to integers if possible
        const aNum = parseInt(a.item_number.toString().split(".")[0]);
        const bNum = parseInt(b.item_number.toString().split(".")[0]);

        if (isNaN(aNum) && isNaN(bNum)) return 0;
        if (isNaN(aNum)) return 1;
        if (isNaN(bNum)) return -1;

        return aNum - bNum;
      });

      setItems(sortedItems);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*");

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);
    } catch (err) {
      console.error("Error fetching data for report:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleColumn = (columnKey) => {
    setSelectedColumns((prev) => {
      if (prev.includes(columnKey)) {
        return prev.filter((key) => key !== columnKey);
      } else {
        return [...prev, columnKey];
      }
    });
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatTaxRate = (value) => {
    if (value === null || value === undefined) return "-";
    return `${(value * 100).toFixed(3)}%`;
  };

  const formatDepreciationPercent = (value) => {
    if (value === null || value === undefined) return "-";
    return `${(value * 100).toFixed(0)}%`;
  };

  const formatBoolean = (value) => {
    return value ? "Yes" : "No";
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : "-";
  };

  const formatCellValue = (item, column, forExcel = false) => {
    // For Excel export, return raw values without formatting
    if (forExcel) {
      if (column === "category") {
        return getCategoryName(item.category_id);
      } else if (item[column] === null || item[column] === undefined) {
        return ""; // Return empty string for null/undefined values in Excel
      } else {
        return item[column];
      }
    }

    // For display in UI and PDF
    if (column === "category") {
      return getCategoryName(item.category_id);
    } else if (
      column === "claimed_rcv" ||
      column === "adjusted_rcv" ||
      column === "rcv_total" ||
      column === "rcv_plus_tax" ||
      column === "depreciation_amount" ||
      column === "acv" ||
      column === "replacement_spent" ||
      column === "holdback_due" ||
      column === "tax_amount"
    ) {
      return formatCurrency(item[column]);
    } else if (column === "tax_rate") {
      return formatTaxRate(item[column]);
    } else if (column === "depreciation_percent") {
      return formatDepreciationPercent(item[column]);
    } else if (column === "replacement_cost_applies" || column === "replaced") {
      return formatBoolean(item[column]);
    } else if (column === "comparable_link") {
      return item[column] || "-";
    } else {
      return item[column] || "-";
    }
  };

  const getFilteredItems = () => {
    if (!filterOption || !filterValue) return items;

    return items.filter((item) => {
      let itemValue;

      if (filterOption === "category") {
        const category = categories.find((c) => c.id === item.category_id);
        itemValue = category ? category.name : "-";
      } else if (filterOption === "tax_rate") {
        itemValue = item.tax_rate !== null ? formatTaxRate(item.tax_rate) : "-";
      } else if (
        filterOption === "replacement_cost_applies" ||
        filterOption === "replaced"
      ) {
        itemValue = item[filterOption] ? "Yes" : "No";
      } else {
        itemValue = item[filterOption] || "-";
      }

      return itemValue === filterValue;
    });
  };

  const getGroupedItems = () => {
    if (!groupByOption) return { "": getFilteredItems() };

    const filteredItems = getFilteredItems();
    const groupedData = {};

    filteredItems.forEach((item) => {
      let groupValue;

      if (groupByOption === "category") {
        const category = categories.find((c) => c.id === item.category_id);
        groupValue = category ? category.name : "Uncategorized";
      } else if (groupByOption === "tax_rate") {
        groupValue =
          item.tax_rate !== null ? formatTaxRate(item.tax_rate) : "No Tax Rate";
      } else if (
        groupByOption === "replacement_cost_applies" ||
        groupByOption === "replaced"
      ) {
        groupValue = item[groupByOption] ? "Yes" : "No";
      } else {
        groupValue = item[groupByOption] || "Unspecified";
      }

      if (!groupedData[groupValue]) {
        groupedData[groupValue] = [];
      }

      groupedData[groupValue].push(item);
    });

    return groupedData;
  };

  const generateExcel = () => {
    if (!claim) return;

    try {
      // Determine which columns to include based on report type
      let columnsToInclude = [];
      if (reportType === "summary") {
        const summaryColumnKeys = [
          "item_number",
          "description",
          "quantity",
          "adjusted_rcv",
          "rcv_total",
          "tax_amount",
          "rcv_plus_tax",
          "depreciation_amount",
          "acv",
        ];

        // Sort summaryColumns based on the order in availableColumns
        columnsToInclude = [...summaryColumnKeys].sort((a, b) => {
          const indexA = availableColumns.findIndex((col) => col.key === a);
          const indexB = availableColumns.findIndex((col) => col.key === b);
          return indexA - indexB;
        });
      } else if (reportType === "detailed") {
        const detailedColumnKeys = [
          "item_number",
          "description",
          "quantity",
          "claimed_rcv",
          "adjusted_rcv",
          "rcv_total",
          "tax_rate",
          "tax_amount",
          "rcv_plus_tax",
          "depreciation_percent",
          "depreciation_amount",
          "acv",
          "replacement_cost_applies",
        ];

        // Sort detailedColumns based on the order in availableColumns
        columnsToInclude = [...detailedColumnKeys].sort((a, b) => {
          const indexA = availableColumns.findIndex((col) => col.key === a);
          const indexB = availableColumns.findIndex((col) => col.key === b);
          return indexA - indexB;
        });
      } else {
        columnsToInclude = selectedColumns;
      }

      // Create headers row
      const headers = columnsToInclude.map((col) => {
        const column = availableColumns.find((c) => c.key === col);
        return column ? column.label : col;
      });

      // Get filtered/grouped items
      const groupedItems = getGroupedItems();
      const wb = XLSX.utils.book_new();

      // Create a worksheet for each group (or just one if not grouping)
      Object.entries(groupedItems).forEach(([groupName, groupItems]) => {
        // Create data rows with raw values for Excel
        const data = groupItems.map((item) => {
          return columnsToInclude.map((col) =>
            formatCellValue(item, col, true),
          );
        });

        // Create worksheet with headers and data
        const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

        // Add the worksheet to the workbook
        const sheetName = groupByOption
          ? groupName.length > 30
            ? groupName.substring(0, 27) + "..."
            : groupName
          : `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`;

        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      // Generate Excel file
      const fileName = groupByOption
        ? `Claim_${claim.file_number}_${reportType}_Grouped_Report.xlsx`
        : `Claim_${claim.file_number}_${reportType}_Report.xlsx`;

      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Error generating Excel:", error);
    }
  };

  const generatePDF = () => {
    if (!claim) return;

    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "in",
        format: "letter",
      });
      if (!doc || !doc.internal || !doc.internal.pageSize) {
        console.error("jsPDF not properly initialized");
        return;
      }

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 0.5;

      // Get filtered items
      const filteredItems = getFilteredItems();

      // Calculate totals for summary report based on filtered items
      const totals = filteredItems.reduce(
        (acc, item) => ({
          itemCount: acc.itemCount + 1,
          adjustedRcvTotal: acc.adjustedRcvTotal + (item.adjusted_rcv || 0),
          rcvTotal: acc.rcvTotal + (item.rcv_total || 0),
          taxTotal: acc.taxTotal + (item.tax_amount || 0),
          rcvPlusTaxTotal: acc.rcvPlusTaxTotal + (item.rcv_plus_tax || 0),
          depreciationTotal:
            acc.depreciationTotal + (item.depreciation_amount || 0),
          acvTotal: acc.acvTotal + (item.acv || 0),
          replacedTotal: acc.replacedTotal + (item.replacement_spent || 0),
          holdbackTotal: acc.holdbackTotal + (item.holdback_due || 0),
        }),
        {
          itemCount: 0,
          adjustedRcvTotal: 0,
          rcvTotal: 0,
          taxTotal: 0,
          rcvPlusTaxTotal: 0,
          depreciationTotal: 0,
          acvTotal: 0,
          replacedTotal: 0,
          holdbackTotal: 0,
        },
      );

      if (reportType === "summary") {
        // Title page for summary report
        doc.setFontSize(20);
        doc.text(
          `Claim #${claim.file_number} - Summary Report`,
          pageWidth / 2,
          margin + 0.5,
          { align: "center" },
        );

        // Add claim info
        doc.setFontSize(12);
        let yPos = margin + 1.2;
        const lineHeight = 0.25;

        // Claim information section
        doc.setFont(undefined, "bold");
        doc.text("Claim Information", margin, yPos);
        doc.setFont(undefined, "normal");
        yPos += lineHeight * 1.5;

        doc.text(
          `Insured: ${claim.insured_first_name} ${claim.insured_last_name}`,
          margin,
          yPos,
        );
        yPos += lineHeight;

        doc.text(`Claim Number: ${claim.file_number}`, margin, yPos);
        yPos += lineHeight;

        doc.text(
          `Property Address: ${claim.property_address}, ${claim.property_city}, ${claim.property_state} ${claim.property_zip_code}`,
          margin,
          yPos,
        );
        yPos += lineHeight;

        // Add email and phone if available
        if (claim.insured_email) {
          doc.text(`Email: ${claim.insured_email}`, margin, yPos);
          yPos += lineHeight;
        }

        if (claim.insured_phone) {
          doc.text(`Telephone: ${claim.insured_phone}`, margin, yPos);
          yPos += lineHeight;
        }

        doc.text(
          `Date of Report: ${new Date().toLocaleDateString()}`,
          margin,
          yPos,
        );
        yPos += lineHeight;

        // Add adjuster information if available
        if (claim.adjuster_id) {
          const adjusterType = claim.adjuster_type || "Adjuster";
          doc.text(
            `${adjusterType}: ${claim.adjuster_name || claim.adjuster_id}`,
            margin,
            yPos,
          );
          yPos += lineHeight;
        }

        // Add summary totals
        yPos += lineHeight * 2;
        doc.setFont(undefined, "bold");
        doc.text("Claim Summary Totals", margin, yPos);
        doc.setFont(undefined, "normal");
        yPos += lineHeight * 1.5;

        doc.text(`Total Items: ${totals.itemCount}`, margin, yPos);
        yPos += lineHeight;

        doc.text(`RCV Total: ${formatCurrency(totals.rcvTotal)}`, margin, yPos);
        yPos += lineHeight;

        doc.text(`Tax: ${formatCurrency(totals.taxTotal)}`, margin, yPos);
        yPos += lineHeight;

        doc.text(
          `RCV + Tax: ${formatCurrency(totals.rcvPlusTaxTotal)}`,
          margin,
          yPos,
        );
        yPos += lineHeight;

        doc.text(
          `Depreciation: ${formatCurrency(totals.depreciationTotal)}`,
          margin,
          yPos,
        );
        yPos += lineHeight;

        doc.text(`ACV: ${formatCurrency(totals.acvTotal)}`, margin, yPos);
        yPos += lineHeight;

        // Add a new page for the items table
        doc.addPage();

        // Prepare table headers and data for summary report
        const summaryColumns = [
          "item_number",
          "description",
          "quantity",
          "adjusted_rcv",
          "rcv_total",
          "tax_amount",
          "rcv_plus_tax",
          "depreciation_amount",
          "acv",
        ];

        const headers = summaryColumns.map((col) => {
          const column = availableColumns.find((c) => c.key === col);
          return column ? column.label : col;
        });

        const data = filteredItems.map((item) => {
          return summaryColumns.map((col) => formatCellValue(item, col));
        });

        // Add the table
        doc.setFontSize(14);

        // If grouping is enabled, create separate tables for each group
        if (groupByOption && reportType === "custom") {
          const groupedItems = getGroupedItems();
          let currentY = margin + 0.7;

          // Get the headers based on selectedColumns to maintain order
          const customHeaders = selectedColumns.map((col) => {
            const column = availableColumns.find((c) => c.key === col);
            return column ? column.label : col;
          });

          Object.entries(groupedItems).forEach(
            ([groupName, groupItems], index) => {
              // Add group header
              if (index > 0) {
                doc.addPage();
                currentY = margin + 0.7;
              }

              doc.setFontSize(14);
              doc.setFont(undefined, "bold");
              doc.text(`Group: ${groupName}`, margin, currentY - 0.3);
              doc.setFont(undefined, "normal");

              // Ensure we use selectedColumns in the correct order
              const groupData = groupItems.map((item) => {
                return selectedColumns.map((col) => formatCellValue(item, col));
              });

              autoTable(doc, {
                head: [customHeaders],
                body: groupData,
                startY: currentY,
                margin: { top: 0.25, right: 0.25, bottom: 0.5, left: 0.25 },
                styles: { fontSize: 8 },
                headStyles: { fillColor: [66, 139, 202] },
                columnStyles: {
                  1: { cellWidth: 2, overflow: "linebreak" }, // Description column (index 1) with text wrapping
                },
                didParseCell: function (data) {
                  if (data.column.index === 1) {
                    // Description column
                    data.cell.styles.cellWidth = 2;
                    data.cell.styles.overflow = "linebreak";
                  }
                },
              });

              currentY = doc.lastAutoTable.finalY + 0.5;
            },
          );
        } else {
          // Regular table without grouping
          const data = filteredItems.map((item) => {
            return selectedColumns.map((col) => formatCellValue(item, col));
          });

          autoTable(doc, {
            head: [headers],
            body: data,
            margin: { top: 0.25, right: 0.25, bottom: 0.5, left: 0.25 },
            styles: { fontSize: 8 },
            headStyles: { fillColor: [66, 139, 202] },
            columnStyles: {
              1: { cellWidth: 2, overflow: "linebreak" }, // Description column (index 1) with text wrapping
            },
            didParseCell: function (data) {
              if (data.column.index === 1) {
                // Description column
                data.cell.styles.cellWidth = 2;
                data.cell.styles.overflow = "linebreak";
              }
            },
          });
        }
      } else if (reportType === "detailed" || reportType === "custom") {
        // Title page for detailed report (similar to summary report)
        doc.setFontSize(20);
        doc.text(
          `Claim #${claim.file_number} - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
          pageWidth / 2,
          margin + 0.5,
          { align: "center" },
        );

        // Add claim info
        doc.setFontSize(12);
        let yPos = margin + 1.2;
        const lineHeight = 0.25;

        // Claim information section
        doc.setFont(undefined, "bold");
        doc.text("Claim Information", margin, yPos);
        doc.setFont(undefined, "normal");
        yPos += lineHeight * 1.5;

        doc.text(
          `Insured: ${claim.insured_first_name} ${claim.insured_last_name}`,
          margin,
          yPos,
        );
        yPos += lineHeight;

        doc.text(`Claim Number: ${claim.file_number}`, margin, yPos);
        yPos += lineHeight;

        doc.text(
          `Property Address: ${claim.property_address}, ${claim.property_city}, ${claim.property_state} ${claim.property_zip_code}`,
          margin,
          yPos,
        );
        yPos += lineHeight;

        // Add email and phone if available
        if (claim.insured_email) {
          doc.text(`Email: ${claim.insured_email}`, margin, yPos);
          yPos += lineHeight;
        }

        if (claim.insured_phone) {
          doc.text(`Telephone: ${claim.insured_phone}`, margin, yPos);
          yPos += lineHeight;
        }

        doc.text(
          `Date of Report: ${new Date().toLocaleDateString()}`,
          margin,
          yPos,
        );
        yPos += lineHeight;

        // Add adjuster information if available
        if (claim.adjuster_id) {
          const adjusterType = claim.adjuster_type || "Adjuster";
          doc.text(
            `${adjusterType}: ${claim.adjuster_name || claim.adjuster_id}`,
            margin,
            yPos,
          );
          yPos += lineHeight;
        }

        // Add summary totals
        yPos += lineHeight * 2;
        doc.setFont(undefined, "bold");
        doc.text("Claim Summary Totals", margin, yPos);
        doc.setFont(undefined, "normal");
        yPos += lineHeight * 1.5;

        doc.text(`Total Items: ${totals.itemCount}`, margin, yPos);
        yPos += lineHeight;

        doc.text(`RCV Total: ${formatCurrency(totals.rcvTotal)}`, margin, yPos);
        yPos += lineHeight;

        doc.text(`Tax: ${formatCurrency(totals.taxTotal)}`, margin, yPos);
        yPos += lineHeight;

        doc.text(
          `RCV + Tax: ${formatCurrency(totals.rcvPlusTaxTotal)}`,
          margin,
          yPos,
        );
        yPos += lineHeight;

        doc.text(
          `Depreciation: ${formatCurrency(totals.depreciationTotal)}`,
          margin,
          yPos,
        );
        yPos += lineHeight;

        doc.text(`ACV: ${formatCurrency(totals.acvTotal)}`, margin, yPos);

        // Add a new page for the items table
        doc.addPage();

        // Prepare table headers and data
        const headers = selectedColumns.map((col) => {
          const column = availableColumns.find((c) => c.key === col);
          return column ? column.label : col;
        });

        const data = filteredItems.map((item) => {
          return selectedColumns.map((col) => formatCellValue(item, col));
        });

        // Add the table
        doc.setFontSize(14);

        // Set specific columns for detailed report if not custom
        if (reportType === "detailed") {
          const detailedColumns = [
            "item_number",
            "description",
            "quantity",
            "claimed_rcv",
            "adjusted_rcv",
            "rcv_total",
            "tax_rate",
            "tax_amount",
            "rcv_plus_tax",
            "depreciation_percent",
            "depreciation_amount",
            "acv",
            "replacement_cost_applies",
          ];

          const detailedHeaders = detailedColumns.map((col) => {
            const column = availableColumns.find((c) => c.key === col);
            return column ? column.label : col;
          });

          const detailedData = filteredItems.map((item) => {
            return detailedColumns.map((col) => formatCellValue(item, col));
          });

          autoTable(doc, {
            head: [detailedHeaders],
            body: detailedData,
            startY: margin,
            margin: { top: 0.25, right: 0.25, bottom: 0.5, left: 0.25 },
            styles: { fontSize: 8 },
            headStyles: { fillColor: [66, 139, 202] },
            didParseCell: function (data) {
              // Find the description column by header name
              const descriptionIndex = detailedHeaders.findIndex(
                (header) => header === "Description",
              );
              if (data.column.index === descriptionIndex) {
                // Description column
                data.cell.styles.cellWidth = 2;
                data.cell.styles.overflow = "linebreak";
              }
            },
          });
        } else {
          autoTable(doc, {
            head: [headers],
            body: data,
            margin: { top: 0.25, right: 0.25, bottom: 0.5, left: 0.25 },
            styles: { fontSize: 8 },
            headStyles: { fillColor: [66, 139, 202] },
            columnStyles: {
              1: { cellWidth: 2, overflow: "linebreak" }, // Description column (index 1) with text wrapping
            },
            didParseCell: function (data) {
              if (data.column.index === 1) {
                // Description column
                data.cell.styles.cellWidth = 2;
                data.cell.styles.overflow = "linebreak";
              }
            },
          });
        }
      }

      // Add page numbers with increased bottom margin
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(
          `${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 0.3, // 0.3 inch from bottom (moved up to avoid overlap)
          { align: "center" },
        );
      }

      // Save the PDF
      const fileName =
        groupByOption && reportType === "custom"
          ? `Claim_${claim.file_number}_${reportType}_Grouped_Report.pdf`
          : `Claim_${claim.file_number}_${reportType}_Report.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-3/4 max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="text-xl font-semibold">Generate Report</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Report Type</h3>
                <div className="flex space-x-4">
                  {reportTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handleReportTypeChange(type.id)}
                      className={cn(
                        "px-4 py-2 rounded-md",
                        reportType === type.id
                          ? "bg-blue-100 text-blue-700 border border-blue-300"
                          : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200",
                      )}
                    >
                      {type.name}
                    </button>
                  ))}
                </div>
              </div>

              {reportType === "custom" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Select Columns</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {availableColumns.map((column) => (
                        <div key={column.key} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`col-${column.key}`}
                            checked={selectedColumns.includes(column.key)}
                            onChange={() => toggleColumn(column.key)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label
                            htmlFor={`col-${column.key}`}
                            className="ml-2 text-sm text-gray-700"
                          >
                            {column.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Filter By</h3>
                      <div className="space-y-3">
                        <select
                          value={filterOption}
                          onChange={(e) => {
                            setFilterOption(e.target.value);
                            setFilterValue("");
                          }}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="">No Filter</option>
                          <option value="room">Room</option>
                          <option value="category">Category</option>
                          <option value="tax_rate">Tax Rate</option>
                          <option value="replacement_cost_applies">
                            RC Applies
                          </option>
                          <option value="replaced">Replaced</option>
                          <option value="holdback_due">Holdback Due</option>
                          <option value="status">Status</option>
                          <option value="age">Age</option>
                          <option value="condition">Condition</option>
                        </select>

                        {filterOption && (
                          <select
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="">Select Value</option>
                            {uniqueFilterValues.map((value, index) => (
                              <option key={index} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-2">
                        Group By{" "}
                        <span className="text-xs text-gray-500">
                          (Excel export only)
                        </span>
                      </h3>
                      <select
                        value={groupByOption}
                        onChange={(e) => setGroupByOption(e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">No Grouping</option>
                        <option value="room">Room</option>
                        <option value="category">Category</option>
                        <option value="tax_rate">Tax Rate</option>
                        <option value="replacement_cost_applies">
                          RC Applies
                        </option>
                        <option value="replaced">Replaced</option>
                        <option value="status">Status</option>
                        <option value="age">Age</option>
                        <option value="condition">Condition</option>
                      </select>
                    </div>
                  </div>

                  {/* Only show clear button when filter or grouping is active */}
                  {(filterOption || groupByOption) && (
                    <div className="mt-4">
                      <button
                        onClick={() => {
                          setFilterOption("");
                          setFilterValue("");
                          setGroupByOption("");
                        }}
                        className="px-3 py-1.5 bg-red-100 text-red-700 border border-red-300 rounded-md hover:bg-red-200 text-sm flex items-center gap-1"
                      >
                        <XMarkIcon className="h-4 w-4" />
                        Clear Filters & Grouping
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div>
                <h3 className="text-lg font-medium mb-2">Preview</h3>
                <div className="border rounded-md p-4 bg-gray-50">
                  <div className="text-sm">
                    <p>
                      <strong>Report Type:</strong>{" "}
                      {reportTypes.find((t) => t.id === reportType)?.name}
                    </p>
                    <p>
                      <strong>Claim #:</strong> {claim?.file_number}
                    </p>
                    <p>
                      <strong>Insured:</strong> {claim?.insured_first_name}{" "}
                      {claim?.insured_last_name}
                    </p>
                    <p>
                      <strong>Items:</strong>{" "}
                      {filterOption && filterValue
                        ? `${getFilteredItems().length} of ${items.length} (filtered)`
                        : items.length}
                    </p>
                    {filterOption && filterValue && (
                      <p>
                        <strong>Filter:</strong> {filterOption} = {filterValue}
                      </p>
                    )}
                    {groupByOption && (
                      <p>
                        <strong>Group By:</strong> {groupByOption}{" "}
                        <span className="text-xs text-gray-500">
                          (Excel export only)
                        </span>
                      </p>
                    )}

                    {/* Preview of columns and sample data */}
                    <div className="mt-4">
                      <p className="font-medium mb-2">
                        Report Columns Preview:
                      </p>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-300 text-xs">
                          <thead>
                            <tr className="bg-blue-100">
                              {(reportType === "summary"
                                ? [
                                    "item_number",
                                    "description",
                                    "quantity",
                                    "adjusted_rcv",
                                    "rcv_total",
                                    "tax_amount",
                                    "rcv_plus_tax",
                                    "depreciation_amount",
                                    "acv",
                                  ]
                                : reportType === "detailed"
                                  ? [
                                      "item_number",
                                      "description",
                                      "quantity",
                                      "claimed_rcv",
                                      "adjusted_rcv",
                                      "rcv_total",
                                      "tax_rate",
                                      "tax_amount",
                                      "rcv_plus_tax",
                                      "depreciation_percent",
                                      "depreciation_amount",
                                      "acv",
                                      "replacement_cost_applies",
                                    ]
                                  : selectedColumns
                              ).map((col) => {
                                const column = availableColumns.find(
                                  (c) => c.key === col,
                                );
                                return (
                                  <th
                                    key={col}
                                    className="border border-gray-300 px-2 py-1"
                                  >
                                    {column ? column.label : col}
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {getFilteredItems()
                              .slice(0, 2)
                              .map((item, idx) => (
                                <tr
                                  key={idx}
                                  className="border-t border-gray-300"
                                >
                                  {(reportType === "summary"
                                    ? [
                                        "item_number",
                                        "description",
                                        "quantity",
                                        "adjusted_rcv",
                                        "rcv_total",
                                        "tax_amount",
                                        "rcv_plus_tax",
                                        "depreciation_amount",
                                        "acv",
                                      ]
                                    : reportType === "detailed"
                                      ? [
                                          "item_number",
                                          "description",
                                          "quantity",
                                          "claimed_rcv",
                                          "adjusted_rcv",
                                          "rcv_total",
                                          "tax_rate",
                                          "tax_amount",
                                          "rcv_plus_tax",
                                          "depreciation_percent",
                                          "depreciation_amount",
                                          "acv",
                                          "replacement_cost_applies",
                                        ]
                                      : selectedColumns
                                  ).map((col) => (
                                    <td
                                      key={col}
                                      className="border border-gray-300 px-2 py-1 truncate max-w-[100px]"
                                    >
                                      {formatCellValue(item, col)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            {(items.length === 0 ||
                              (filterOption &&
                                filterValue &&
                                getFilteredItems().length === 0)) && (
                              <tr>
                                <td
                                  colSpan={
                                    reportType === "custom"
                                      ? selectedColumns.length
                                      : 9
                                  }
                                  className="text-center py-2"
                                >
                                  No items to display
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-4 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <div className="flex space-x-2">
            <button
              onClick={generateExcel}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              Export Excel
            </button>
            <button
              onClick={generatePDF}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              Export PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
