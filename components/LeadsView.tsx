

import React from 'react';
import { ExtractedLead, LeadDocument, StoredLead, Category } from '../types';
import InputArea from './InputArea';
import LeadResultsDisplay from './LeadResultsDisplay';
import { RefreshIcon, TrashIcon, DocumentTextIcon, FilePdfIcon, FileImageIcon, FileWordIcon, FileExcelIcon, UsersIcon, LinkIcon } from './Icons';
import { getCategoryHexColor } from '../utils/color';

interface LeadsViewProps {
  onExtract: (files: File[], text: string) => void;
  isLoading: boolean;
  extractionResults: ExtractedLead[];
  onAddToList: (data: ExtractedLead) => void;
  onBulkAddToList: (data: ExtractedLead[]) => void;
  storedLeads: StoredLead[];
  onDeleteStoredLead: (leadId: string) => void;
  storedLeadDocuments: LeadDocument[];
  onDeleteLeadDocument: (docId: string) => void;
  onReExtractLead: (doc: LeadDocument) => void;
  allCategories: Category[];
  onAddCategory: (category: Category) => void;
  onUpdateCategory: (oldName: string, category: Category) => void;
}

const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImageIcon className="w-6 h-6 text-pink-500" />;
    if (mimeType.includes('pdf')) return <FilePdfIcon className="w-6 h-6 text-red-500" />;
    if (mimeType.includes('word')) return <FileWordIcon className="w-6 h-6 text-blue-500" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileExcelIcon className="w-6 h-6 text-green-500" />;
    return <DocumentTextIcon className="w-6 h-6 text-slate-500" />;
};

const StoredLeadsList: React.FC<{
    leads: StoredLead[];
    onDelete: (leadId: string) => void;
    allCategories: Category[];
}> = ({ leads, onDelete, allCategories }) => {
    if (leads.length === 0) {
        return (
            <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                <UsersIcon className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500" />
                <h3 className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-200">Your Leads List is Empty</h3>
                <p className="mt-1">Leads you add from the extraction results will appear here.</p>
            </div>
        )
    }
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                    <tr>
                        <th scope="col" className="px-6 py-3">Name</th>
                        <th scope="col" className="px-6 py-3">Category</th>
                        <th scope="col" className="px-6 py-3">Email</th>
                        <th scope="col" className="px-6 py-3">Phone</th>
                        <th scope="col" className="px-6 py-3">Contact Person</th>
                        <th scope="col" className="px-6 py-3">Links</th>
                        <th scope="col" className="px-6 py-3">Source</th>
                        <th scope="col" className="px-6 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {leads.map(lead => (
                        <tr key={lead.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600/20">
                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{lead.name}</td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {(lead.category || ['General']).map(catName => (
                                        <span
                                            key={catName}
                                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                            style={{
                                                backgroundColor: getCategoryHexColor(catName, allCategories) + '20',
                                                color: getCategoryHexColor(catName, allCategories),
                                            }}
                                        >
                                            {catName}
                                        </span>
                                    ))}
                                </div>
                            </td>
                            <td className="px-6 py-4">{lead.email || 'N/A'}</td>
                            <td className="px-6 py-4">{lead.phoneNumber || 'N/A'}</td>
                            <td className="px-6 py-4">{lead.contactPerson || 'N/A'}</td>
                            <td className="px-6 py-4">
                                {lead.links && lead.links.length > 0 ? (
                                    <a href={lead.links[0]} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
                                       <LinkIcon className="w-4 h-4" /> View Link
                                       {lead.links.length > 1 && ` (+${lead.links.length - 1})`}
                                    </a>
                                ) : 'N/A'}
                            </td>
                            <td className="px-6 py-4">{lead.source}</td>
                            <td className="px-6 py-4">
                                <button onClick={() => onDelete(lead.id)} title="Delete Lead" className="font-medium text-red-600 dark:text-red-500 hover:underline">
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


const StoredLeadDocumentsList: React.FC<{
    documents: LeadDocument[];
    onDelete: (docId: string) => void;
    onReExtract: (doc: LeadDocument) => void;
}> = ({ documents, onDelete, onReExtract }) => {
    if (documents.length === 0) {
        return <p className="text-center text-slate-500 dark:text-slate-400 py-8">No documents uploaded for lead extraction yet.</p>
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                    <tr>
                        <th scope="col" className="px-6 py-3 w-12">Type</th>
                        <th scope="col" className="px-6 py-3">Name</th>
                        <th scope="col" className="px-6 py-3">Uploaded</th>
                        <th scope="col" className="px-6 py-3">Size</th>
                        <th scope="col" className="px-6 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {documents.map(doc => (
                        <tr key={doc.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600/20">
                            <td className="px-6 py-4">{getFileIcon(doc.type)}</td>
                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{doc.name}</td>
                            <td className="px-6 py-4">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                            <td className="px-6 py-4">{(doc.size / 1024).toFixed(2)} KB</td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => onReExtract(doc)} title="Re-extract" className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline"><RefreshIcon className="w-5 h-5"/></button>
                                    <button onClick={() => onDelete(doc.id)} title="Delete" className="font-medium text-red-600 dark:text-red-500 hover:underline"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


const LeadsView: React.FC<LeadsViewProps> = (props) => {
  return (
    <>
      <InputArea onExtract={props.onExtract} isLoading={props.isLoading} />
      <LeadResultsDisplay
        results={props.extractionResults}
        isLoading={props.isLoading}
        onAddToList={props.onAddToList}
        onBulkAddToList={props.onBulkAddToList}
        allCategories={props.allCategories}
        onAddCategory={props.onAddCategory}
        onUpdateCategory={props.onUpdateCategory}
      />
      <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Leads List</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your saved contacts and leads.</p>
            </div>
            <StoredLeadsList leads={props.storedLeads} onDelete={props.onDeleteStoredLead} allCategories={props.allCategories} />
        </div>
       <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Lead Source Documents</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Previously uploaded files for lead extraction.</p>
            </div>
            <StoredLeadDocumentsList documents={props.storedLeadDocuments} onDelete={props.onDeleteLeadDocument} onReExtract={props.onReExtractLead} />
        </div>
    </>
  );
};

export default LeadsView;