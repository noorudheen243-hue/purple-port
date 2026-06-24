const ts = require('typescript');
const fs = require('fs');

const file = './src/pages/crm/ClientCrmWorkspace.tsx';
const code = fs.readFileSync(file, 'utf8');
const lines = code.split('\n');

function checkRangePrint(start, end) {
    let testLines = [
        `import React from "react";`,
        `import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";`,
        `import { Label } from "@/components/ui/label";`,
        `import { Input } from "@/components/ui/input";`,
        `import { Button } from "@/components/ui/button";`,
        `import { Badge } from "@/components/ui/badge";`,
        `import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";`,
        `import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";`,
        `import { Textarea } from "@/components/ui/textarea";`,
        `const TestComponent = () => {`,
        `  const leads = [];`,
        `  const staffList = [];`,
        `  const selectedLeads = [];`,
        `  const isAddOpen = false;`,
        `  const isBulkAssignOpen = false;`,
        `  const isBulkUpdateOpen = false;`,
        `  const isImportOpen = false;`,
        `  const isMergeOpen = false;`,
        `  const selectedLeadDetails = null;`,
        `  const CRM_STAGES = [];`,
        `  const search = "";`,
        `  const setSearch = () => {};`,
        `  const stage = "";`,
        `  const setStage = () => {};`,
        `  const quality = "";`,
        `  const setQuality = () => {};`,
        `  const assignee = "";`,
        `  const setAssignee = () => {};`,
        `  const toggleSelectAll = () => {};`,
        `  const toggleSelectLead = () => {};`,
        `  const setIsAddOpen = () => {};`,
        `  const setIsImportOpen = () => {};`,
        `  const setIsMergeOpen = () => {};`,
        `  const setIsBulkAssignOpen = () => {};`,
        `  const setIsBulkUpdateOpen = () => {};`,
        `  const setSelectedLeads = () => {};`,
        `  const fetchLeadDetails = () => {};`,
        `  const addForm = {};`,
        `  const setAddForm = () => {};`,
        `  const createLeadMutation = { isPending: false, mutate: () => {} };`,
        `  const bulkAssignUser = "";`,
        `  const setBulkAssignUser = () => {};`,
        `  const bulkAssignMutation = { isPending: false, mutate: () => {} };`,
        `  const bulkUpdateStage = "";`,
        `  const setBulkUpdateStage = () => {};`,
        `  const bulkUpdateQuality = "";`,
        `  const setBulkUpdateQuality = () => {};`,
        `  const bulkUpdateMutation = { isPending: false, mutate: () => {} };`,
        `  const mergePrimary = "";`,
        `  const setMergePrimary = () => {};`,
        `  const mergeDuplicate = "";`,
        `  const setMergeDuplicate = () => {};`,
        `  const mergeMutation = { isPending: false, mutate: () => {} };`,
        `  const csvText = "";`,
        `  const setCsvText = () => {};`,
        `  const handleCsvParseAndImport = () => {};`,
        `  const importMutation = { isPending: false, mutate: () => {} };`,
        `  const updateDetailsMutation = { mutate: () => {} };`,
        `  const newNote = "";`,
        `  const setNewNote = () => {};`,
        `  const addNoteMutation = { isPending: false, mutate: () => {} };`,
        `  const isLoading = false;`,
        `  return (`,
        ...lines.slice(start - 1, end),
        `      </div>`, // Close root div
        `  );`,
        `};`
    ];
    let testCode = testLines.join('\n');
    console.log(testCode.substring(testCode.lastIndexOf('<Dialog open={isAddOpen}')));
}

checkRangePrint(860, 1199);
