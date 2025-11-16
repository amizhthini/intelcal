
import React from 'react';
import { Space, Task } from '../types';
import { ClipboardListIcon, PlusIcon } from './Icons';

interface TaskListProps {
    selectedSpace: Space | null;
    tasks: Task[];
}

const TaskList: React.FC<TaskListProps> = ({ selectedSpace, tasks }) => {
    if (!selectedSpace) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                <ClipboardListIcon className="w-16 h-16 text-slate-400 dark:text-slate-500" />
                <h3 className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-200">Select a space</h3>
                <p className="mt-1 text-slate-500 dark:text-slate-400">Choose a space from the sidebar to view its tasks.</p>
            </div>
        );
    }
    
    // For now, it's a placeholder
    return (
        <div className="flex-1 p-6 bg-white dark:bg-slate-800 rounded-lg shadow-inner">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{selectedSpace.name}</h2>
                <button className="flex items-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 transition-all">
                    <PlusIcon className="w-5 h-5" />
                    New Task
                </button>
            </div>
            <div className="text-center py-16 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Task Management is Coming Soon!</h3>
                <p className="mt-1 text-slate-500 dark:text-slate-400">You'll be able to add, assign, and track tasks here.</p>
            </div>
        </div>
    );
};

export default TaskList;
