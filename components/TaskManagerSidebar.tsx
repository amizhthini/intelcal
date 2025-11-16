
import React, { useState } from 'react';
import { Company, Space } from '../types';
import { PlusIcon, TrashIcon, ChevronRightIcon } from './Icons';

interface TaskManagerSidebarProps {
    companies: Company[];
    spaces: Space[];
    selectedSpaceId: string | null;
    onSelectSpace: (spaceId: string) => void;
    onAddCompany: () => void;
    onDeleteCompany: (companyId: string) => void;
    onAddSpace: (companyId: string) => void;
    onDeleteSpace: (spaceId: string) => void;
}

const TaskManagerSidebar: React.FC<TaskManagerSidebarProps> = (props) => {
    const { companies, spaces, selectedSpaceId, onSelectSpace, onAddCompany, onDeleteCompany, onAddSpace, onDeleteSpace } = props;
    const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set(companies.map(c => c.id)));

    const toggleCompany = (companyId: string) => {
        setExpandedCompanies(prev => {
            const newSet = new Set(prev);
            if (newSet.has(companyId)) {
                newSet.delete(companyId);
            } else {
                newSet.add(companyId);
            }
            return newSet;
        });
    };
    
    return (
        <aside className="w-full md:w-64 lg:w-72 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg shrink-0">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Workspaces</h3>
                <button onClick={onAddCompany} title="Add Company" className="p-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full">
                    <PlusIcon className="w-5 h-5"/>
                </button>
            </div>
            <div className="space-y-2">
                {companies.map(company => {
                    const companySpaces = spaces.filter(s => s.companyId === company.id);
                    const isExpanded = expandedCompanies.has(company.id);
                    return (
                        <div key={company.id}>
                            <div className="group flex items-center justify-between rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-700/50">
                                <button onClick={() => toggleCompany(company.id)} className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200 flex-grow text-left">
                                    <ChevronRightIcon className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                    {company.name}
                                </button>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onAddSpace(company.id)} title="Add Space" className="p-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full"><PlusIcon className="w-4 h-4"/></button>
                                    <button onClick={() => onDeleteCompany(company.id)} title="Delete Company" className="p-1 text-slate-500 hover:text-red-500 dark:hover:text-red-500 rounded-full"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            </div>
                            {isExpanded && (
                                <ul className="pl-6 mt-1 space-y-1">
                                    {companySpaces.map(space => (
                                        <li key={space.id} className="group">
                                            <div className="flex items-center justify-between">
                                                <button
                                                    onClick={() => onSelectSpace(space.id)}
                                                    className={`w-full text-left text-sm p-2 rounded-md ${selectedSpaceId === space.id ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                                                >
                                                    {space.name}
                                                </button>
                                                <button onClick={() => onDeleteSpace(space.id)} title="Delete Space" className="p-1 text-slate-500 hover:text-red-500 dark:hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shrink-0"><TrashIcon className="w-4 h-4"/></button>
                                            </div>
                                        </li>
                                    ))}
                                    {companySpaces.length === 0 && (
                                        <li className="text-xs text-slate-400 dark:text-slate-500 pl-2">No spaces yet.</li>
                                    )}
                                </ul>
                            )}
                        </div>
                    );
                })}
                 {companies.length === 0 && (
                    <div className="text-center p-4 text-sm text-slate-500 dark:text-slate-400">
                        <p>Create a company to get started.</p>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default TaskManagerSidebar;
