// A predefined color palette for common categories for better aesthetics.
const PREDEFINED_COLORS: Record<string, { background: string; text: string }> = {
    'business': { background: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-200' },
    'personal': { background: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-200' },
    'grant': { background: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-800 dark:text-yellow-200' },
    'competition': { background: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-800 dark:text-purple-200' },
    'meeting': { background: 'bg-pink-100 dark:bg-pink-900/50', text: 'text-pink-800 dark:text-pink-200' },
    'deadline': { background: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-200' },
    'social': { background: 'bg-teal-100 dark:bg-teal-900/50', text: 'text-teal-800 dark:text-teal-200' },
    'general': { background: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-800 dark:text-slate-200' },
};

// Fallback colors for categories not in the predefined list.
const FALLBACK_COLORS = [
    { background: 'bg-cyan-100 dark:bg-cyan-900/50', text: 'text-cyan-800 dark:text-cyan-200' },
    { background: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-800 dark:text-orange-200' },
    { background: 'bg-lime-100 dark:bg-lime-900/50', text: 'text-lime-800 dark:text-lime-200' },
    { background: 'bg-fuchsia-100 dark:bg-fuchsia-900/50', text: 'text-fuchsia-800 dark:text-fuchsia-200' },
];

/**
 * Generates a consistent color class for a given category string.
 * @param category The category string.
 * @returns An object with Tailwind CSS classes for background and text color.
 */
export const getCategoryColorClasses = (category: string | undefined | null) => {
    if (!category) {
        return PREDEFINED_COLORS['general'];
    }

    const lowerCaseCategory = category.toLowerCase();
    
    // Check for a direct match or partial match in predefined colors.
    for (const key in PREDEFINED_COLORS) {
        if (lowerCaseCategory.includes(key)) {
            return PREDEFINED_COLORS[key];
        }
    }
    
    // Fallback to a color based on a simple hash of the category string.
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
        hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % FALLBACK_COLORS.length);
    return FALLBACK_COLORS[index];
};

/**
 * Returns a hex color for a given category for use in style attributes.
 * @param category The category string.
 * @returns A hex color code string.
 */
export const getCategoryHexColor = (category: string | undefined | null): string => {
    const colors: Record<string, string> = {
        'business': '#3b82f6', // blue-500
        'personal': '#22c55e', // green-500
        'grant': '#eab308', // yellow-500
        'competition': '#a855f7', // purple-500
        'meeting': '#ec4899', // pink-500
        'deadline': '#ef4444', // red-500
        'social': '#14b8a6', // teal-500
        'general': '#64748b', // slate-500
    };

    if (!category) {
        return colors['general'];
    }
    const lowerCaseCategory = category.toLowerCase();
    for (const key in colors) {
        if (lowerCaseCategory.includes(key)) {
            return colors[key];
        }
    }

    // Fallback based on hash
    const fallbackHex = ['#06b6d4', '#f97316', '#84cc16', '#d946ef']; // cyan, orange, lime, fuchsia
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
        hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % fallbackHex.length);
    return fallbackHex[index];
}
