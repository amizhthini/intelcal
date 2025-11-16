
import React, { useState, useMemo } from 'react';
import { Company, Space, Task } from '../types';
import TaskManagerSidebar from './TaskManagerSidebar';
import TaskList from './TaskList';
import CompanyModal from './CompanyModal';
import SpaceModal from './SpaceModal';

interface TaskManagerViewProps {
    companies: Company[];
    spaces: Space[];
    tasks: Task[];
    onAddCompany: (name: string) => void;
    onDeleteCompany: (companyId: string) => void;
    onAddSpace: (name: string, companyId: string) => void;
    onDeleteSpace: (spaceId: string) => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

const TaskManagerView: React.FC<TaskManagerViewProps> = (props) => {
    const { companies, spaces, tasks, onAddCompany, onDeleteCompany, onAddSpace, onDeleteSpace } = props;

    const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
    const [companyForSpaceModal, setCompanyForSpaceModal] = useState<string | null>(null);

    const selectedSpace = useMemo(() => {
        return spaces.find(s => s.id === selectedSpaceId) || null;
    }, [selectedSpaceId, spaces]);
    
    const tasksForSelectedSpace = useMemo(() => {
        if (!selectedSpaceId) return [];
        return tasks.filter(t => t.spaceId === selectedSpaceId);
    }, [selectedSpaceId, tasks]);

    const handleAddCompanyClick = () => {
        setIsCompanyModalOpen(true);
    };

    const handleAddSpaceClick = (companyId: string) => {
        setCompanyForSpaceModal(companyId);
        setIsSpaceModalOpen(true);
    };

    const handleSaveCompany = (name: string) => {
        onAddCompany(name);
    };

    const handleSaveSpace = (name: string, companyId: string) => {
        onAddSpace(name, companyId);
    };

    return (
        <div className="mt-6">
            {isCompanyModalOpen && (
                <CompanyModal
                    isOpen={isCompanyModalOpen}
                    onClose={() => setIsCompanyModalOpen(false)}
                    onSave={handleSaveCompany}
                />
            )}
            {isSpaceModalOpen && companyForSpaceModal && (
                <SpaceModal
                    isOpen={isSpaceModalOpen}
                    onClose={() => setIsSpaceModalOpen(false)}
                    onSave={handleSaveSpace}
                    companyId={companyForSpaceModal}
                />
            )}

            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">Task Manager</h2>
            <div className="flex flex-col md:flex-row gap-6">
                <TaskManagerSidebar
                    companies={companies}
                    spaces={spaces}
                    selectedSpaceId={selectedSpaceId}
                    onSelectSpace={setSelectedSpaceId}
                    onAddCompany={handleAddCompanyClick}
                    onDeleteCompany={onDeleteCompany}
                    onAddSpace={handleAddSpaceClick}
                    onDeleteSpace={onDeleteSpace}
                />
                <TaskList selectedSpace={selectedSpace} tasks={tasksForSelectedSpace} />
            </div>
        </div>
    );
};

export default TaskManagerView;
