
import React, { useState, useEffect } from 'react';
import { Space } from '../types';

interface SpaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, companyId: string) => void;
    spaceToEdit?: Space | null;
    companyId: string;
}

const SpaceModal: React.FC<SpaceModalProps> = ({ isOpen, onClose, onSave, spaceToEdit, companyId }) => {
    const [name, setName] = useState('');

    useEffect(() => {
        setName(spaceToEdit ? spaceToEdit.name : '');
    }, [spaceToEdit]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onSave(name.trim(), companyId);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold">{spaceToEdit ? 'Edit Space' : 'Create Space'}</h3>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <label htmlFor="space-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Space Name (e.g., Project Name)</label>
                        <input
                            id="space-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoFocus
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SpaceModal;
