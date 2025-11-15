
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Category } from '../types';
import { COLOR_PALETTE } from '../utils/categories';
import { CheckCircleIcon } from './Icons';

interface CategorySelectorProps {
    value: string; // The name of the category
    onChange: (categoryName: string, isNew?: boolean) => void;
    onColorChange: (categoryName: string, newColor: string) => void;
    allCategories: Category[];
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ value, onChange, onColorChange, allCategories }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedCategory = useMemo(() => allCategories.find(c => c.name.toLowerCase() === value.toLowerCase()), [allCategories, value]);
    const filteredCategories = useMemo(() => {
        if (!filter) return allCategories;
        return allCategories.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
    }, [allCategories, filter]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setFilter(''); 
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const handleSelectCategory = (category: Category) => {
        onChange(category.name);
        setIsOpen(false);
        setFilter('');
    };

    const handleCreateCategory = () => {
        if (filter && !allCategories.some(c => c.name.toLowerCase() === filter.toLowerCase())) {
            onChange(filter, true); 
            setIsOpen(false);
            setFilter('');
        }
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full text-left p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
            >
                <span className="flex items-center gap-2 truncate">
                    {selectedCategory && <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedCategory.color }}></div>}
                    <span className="text-sm font-medium">{value || 'Select Category'}</span>
                </span>
                <svg className="w-4 h-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-10 mt-1 w-64 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                    <div className="p-2">
                        <input
                            type="text"
                            autoFocus
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                            placeholder="Find or create category..."
                            className="w-full px-2 py-1 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                        />
                    </div>
                    <ul className="max-h-48 overflow-y-auto">
                        {filteredCategories.map(cat => (
                            <li key={cat.name} className="group/item flex items-center justify-between p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                <span className="flex items-center gap-2 text-sm" onClick={() => handleSelectCategory(cat)}>
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                                    {cat.name}
                                </span>
                                <div className="hidden group-hover/item:flex items-center gap-0.5">
                                    {COLOR_PALETTE.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => onColorChange(cat.name, color)}
                                            className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center"
                                            style={{ backgroundColor: color }}
                                            aria-label={`Set color to ${color}`}
                                        >
                                          {cat.color === color && <div className="w-2 h-2 rounded-full bg-white/70"></div>}
                                        </button>
                                    ))}
                                </div>
                            </li>
                        ))}
                    </ul>
                    {filter && !allCategories.some(c => c.name.toLowerCase() === filter.toLowerCase()) && (
                         <div className="p-2 border-t border-slate-200 dark:border-slate-600">
                            <button
                                type="button"
                                onClick={handleCreateCategory}
                                className="w-full text-sm text-left text-indigo-600 dark:text-indigo-400 font-semibold p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                            >
                                + Create "{filter}"
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CategorySelector;
