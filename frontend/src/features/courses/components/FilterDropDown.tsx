import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface FilterDropDownProps {
    label?: string;
    options: string[];
    /**
     * Optional controlled selection. When provided the component becomes
     * fully controlled — internal state is ignored and `onChange` is the
     * single source of mutations.
     */
    value?: string[];
    onChange?: (selected: string[]) => void;
}

export const FilterDropDown = ({
    label = 'Select items...',
    options,
    value,
    onChange,
}: FilterDropDownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [internalSelected, setInternalSelected] = useState<string[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isControlled = value !== undefined;
    const selected = isControlled ? value : internalSelected;

    const updateSelected = (next: string[]) => {
        if (!isControlled) setInternalSelected(next);
        onChange?.(next);
    };

    // Filter options based on search term
    const filteredOptions = options.filter((option) =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle item selection
    const handleSelectItem = (item: string) => {
        const newSelected = selected.includes(item)
            ? selected.filter((s) => s !== item)
            : [...selected, item];
        updateSelected(newSelected);
    };

    // Handle select all
    const handleSelectAll = () => {
        if (selected.length === options.length) {
            updateSelected([]);
        } else {
            updateSelected(options);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get display text
    const getDisplayText = () => {
        if (selected.length === 0) return label;
        if (selected.length === 1) return selected[0];
        return `${selected[0]} +${selected.length - 1}`;
    };

    return (
        <div ref={dropdownRef} className="relative inline-block min-w-40 max-w-100">
            {/* Dropdown header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 ${selected.length==0?"bg-white": "bg-green-200 "} border-2 border-gray-600
                rounded-4xl text-center text-gray-800 flex items-center justify-between hover:bg-gray-200 focus:outline-none focus:ring-2`}
            >
                <span className={selected.length > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}>
                    {getDisplayText()}
                </span>
                <ChevronDown
                    size={20}
                    className={`text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''
                        }`}
                />
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-lg z-50">
                    {/* Search input */}
                    <div className="p-3 border-b border-gray-200">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                            autoFocus
                        />
                    </div>

                    {/* Options list */}
                    <div className="max-h-48 overflow-y-auto">
                        {/* Select All option */}
                        <label className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selected.length === options.length && options.length > 0}
                                onChange={handleSelectAll}
                                className="w-4 h-4 text-gray-500 rounded focus:ring-2 focus:ring-gray-400"
                            />
                            <span className="ml-3 text-gray-800 font-medium">Select All</span>
                        </label>

                        {/* Individual options */}
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <label
                                    key={option}
                                    className={`flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer ${selected.includes(option) ? 'bg-gray-50' : ''
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(option)}
                                        onChange={() => handleSelectItem(option)}
                                        className="w-4 h-4 text-gray-500 rounded focus:ring-2 focus:ring-gray-400"
                                    />
                                    <span className="ml-3 text-gray-800">{option}</span>
                                </label>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-center text-gray-500">
                                No options found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
