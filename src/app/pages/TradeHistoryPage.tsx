import { useState, useMemo } from 'react';
import { Card } from '../components/ui/card';
import {
    Download,
    Copy,
    Clock,
    Check,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Search,
    Filter,
    X,
    ArrowUpDown
} from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { Trade } from '../services/tradeService';

interface TradeHistoryPageProps {
    currencySymbol: string;
    loggedTrades: Trade[];
    isDarkMode: boolean;
    onDeleteTrade: (id: string) => void;
    onBack: () => void;
}

const ITEMS_PER_PAGE = 20;

type SortField = 'date' | 'symbol' | 'entry' | 'riskPercent' | 'rrRatio';
type SortDirection = 'asc' | 'desc';

export function TradeHistoryPage({
    currencySymbol,
    loggedTrades,
    isDarkMode,
    onDeleteTrade,
    onBack
}: TradeHistoryPageProps) {

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Filtering
    const [searchQuery, setSearchQuery] = useState('');
    const [directionFilter, setDirectionFilter] = useState<'all' | 'long' | 'short'>('all');
    const [setupFilter, setSetupFilter] = useState<string>('all');

    // Sorting
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // Copy states
    const [copied, setCopied] = useState(false);
    const [rowCopied, setRowCopied] = useState<string | null>(null);

    // Get unique setups for filter
    const uniqueSetups = useMemo(() => {
        const setups = new Set(loggedTrades.map(t => t.setup));
        return Array.from(setups).sort();
    }, [loggedTrades]);

    // Filter and sort trades
    const filteredAndSortedTrades = useMemo(() => {
        let filtered = [...loggedTrades];

        // Apply search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(trade =>
                trade.symbol.toLowerCase().includes(query) ||
                trade.setup.toLowerCase().includes(query)
            );
        }

        // Apply direction filter
        if (directionFilter !== 'all') {
            filtered = filtered.filter(trade => trade.direction === directionFilter);
        }

        // Apply setup filter
        if (setupFilter !== 'all') {
            filtered = filtered.filter(trade => trade.setup === setupFilter);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let comparison = 0;

            switch (sortField) {
                case 'date':
                    comparison = a.date.localeCompare(b.date);
                    break;
                case 'symbol':
                    comparison = a.symbol.localeCompare(b.symbol);
                    break;
                case 'entry':
                    comparison = a.entry - b.entry;
                    break;
                case 'riskPercent':
                    comparison = a.riskPercent - b.riskPercent;
                    break;
                case 'rrRatio':
                    const aRR = a.rrRatio ?? 0;
                    const bRR = b.rrRatio ?? 0;
                    comparison = aRR - bRR;
                    break;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [loggedTrades, searchQuery, directionFilter, setupFilter, sortField, sortDirection]);

    // Pagination
    const totalPages = Math.ceil(filteredAndSortedTrades.length / ITEMS_PER_PAGE);
    const paginatedTrades = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredAndSortedTrades.slice(startIndex, endIndex);
    }, [filteredAndSortedTrades, currentPage]);

    // Reset to page 1 when filters change
    useMemo(() => {
        setCurrentPage(1);
    }, [searchQuery, directionFilter, setupFilter, sortField, sortDirection]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(JSON.stringify(filteredAndSortedTrades, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredAndSortedTrades, null, 2));
        const downloadAnchorNode = document.createElement("a");
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `trade_history_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleRowCopy = async (trade: Trade) => {
        await navigator.clipboard.writeText(JSON.stringify(trade, null, 2));
        setRowCopied(trade.id ?? null);
        setTimeout(() => setRowCopied(null), 2000);
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setDirectionFilter('all');
        setSetupFilter('all');
    };

    const hasActiveFilters = searchQuery || directionFilter !== 'all' || setupFilter !== 'all';

    return (
        <div className="min-h-screen transition-colors duration-300 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 bg-gradient-to-br from-gray-50 via-white to-gray-100 pt-20">
            <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className={`p-2 rounded-lg transition-colors ${isDarkMode
                                ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Trade History
                        </h1>
                    </div>
                </div>

                <Card className={`p-6 shadow-sm transition-all duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    }`}>
                    {/* Filters */}
                    <div className="mb-6 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* Search */}
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by symbol or setup..."
                                    className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm transition-colors ${isDarkMode
                                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                />
                            </div>

                            {/* Direction Filter */}
                            <Select.Root value={directionFilter} onValueChange={(v) => setDirectionFilter(v as any)}>
                                <Select.Trigger
                                    className={`min-w-[140px] px-3 py-2 border rounded-lg text-sm transition-colors flex items-center justify-between ${isDarkMode
                                        ? 'bg-gray-700 border-gray-600 text-white'
                                        : 'bg-white border-gray-200 text-gray-900'
                                        } hover:border-gray-400`}
                                >
                                    <span className="flex items-center gap-2">
                                        <Filter className="w-4 h-4" />
                                        <Select.Value />
                                    </span>
                                </Select.Trigger>
                                <Select.Portal>
                                    <Select.Content
                                        position="popper"
                                        sideOffset={4}
                                        className={`w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                                            } border z-50`}
                                    >
                                        <Select.Viewport className="p-1">
                                            <Select.Item value="all" className={`px-3 py-2 text-sm rounded cursor-pointer outline-none ${isDarkMode ? 'text-white hover:bg-gray-600 data-[highlighted]:bg-gray-600' : 'text-gray-900 hover:bg-gray-100 data-[highlighted]:bg-gray-100'
                                                }`}>
                                                <Select.ItemText>All Directions</Select.ItemText>
                                            </Select.Item>
                                            <Select.Item value="long" className={`px-3 py-2 text-sm rounded cursor-pointer outline-none ${isDarkMode ? 'text-white hover:bg-gray-600 data-[highlighted]:bg-gray-600' : 'text-gray-900 hover:bg-gray-100 data-[highlighted]:bg-gray-100'
                                                }`}>
                                                <Select.ItemText>Long Only</Select.ItemText>
                                            </Select.Item>
                                            <Select.Item value="short" className={`px-3 py-2 text-sm rounded cursor-pointer outline-none ${isDarkMode ? 'text-white hover:bg-gray-600 data-[highlighted]:bg-gray-600' : 'text-gray-900 hover:bg-gray-100 data-[highlighted]:bg-gray-100'
                                                }`}>
                                                <Select.ItemText>Short Only</Select.ItemText>
                                            </Select.Item>
                                        </Select.Viewport>
                                    </Select.Content>
                                </Select.Portal>
                            </Select.Root>

                            {/* Setup Filter */}
                            <Select.Root value={setupFilter} onValueChange={setSetupFilter}>
                                <Select.Trigger
                                    className={`min-w-[160px] px-3 py-2 border rounded-lg text-sm transition-colors flex items-center justify-between ${isDarkMode
                                        ? 'bg-gray-700 border-gray-600 text-white'
                                        : 'bg-white border-gray-200 text-gray-900'
                                        } hover:border-gray-400`}
                                >
                                    <Select.Value />
                                </Select.Trigger>
                                <Select.Portal>
                                    <Select.Content
                                        position="popper"
                                        sideOffset={4}
                                        className={`w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                                            } border z-50`}
                                    >
                                        <Select.Viewport className="p-1 max-h-64 overflow-y-auto">
                                            <Select.Item value="all" className={`px-3 py-2 text-sm rounded cursor-pointer outline-none ${isDarkMode ? 'text-white hover:bg-gray-600 data-[highlighted]:bg-gray-600' : 'text-gray-900 hover:bg-gray-100 data-[highlighted]:bg-gray-100'
                                                }`}>
                                                <Select.ItemText>All Setups</Select.ItemText>
                                            </Select.Item>
                                            {uniqueSetups.map(setup => (
                                                <Select.Item key={setup} value={setup} className={`px-3 py-2 text-sm rounded cursor-pointer outline-none ${isDarkMode ? 'text-white hover:bg-gray-600 data-[highlighted]:bg-gray-600' : 'text-gray-900 hover:bg-gray-100 data-[highlighted]:bg-gray-100'
                                                    }`}>
                                                    <Select.ItemText>{setup}</Select.ItemText>
                                                </Select.Item>
                                            ))}
                                        </Select.Viewport>
                                    </Select.Content>
                                </Select.Portal>
                            </Select.Root>

                            {/* Clear Filters */}
                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className={`px-3 py-2 border rounded-lg text-sm transition-colors flex items-center gap-2 ${isDarkMode
                                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <X className="w-4 h-4" />
                                    Clear
                                </button>
                            )}

                            {/* Export Buttons */}
                            {filteredAndSortedTrades.length > 0 && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCopy}
                                        title="Copy All JSON"
                                        className={`p-2 rounded-lg transition-colors ${isDarkMode
                                            ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                            }`}
                                    >
                                        {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                    <button
                                        onClick={handleDownload}
                                        title="Export All JSON"
                                        className={`p-2 rounded-lg transition-colors ${isDarkMode
                                            ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                            }`}
                                    >
                                        <Download className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Results count */}
                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Showing {filteredAndSortedTrades.length} trade{filteredAndSortedTrades.length !== 1 ? 's' : ''}
                            {hasActiveFilters && ` (filtered from ${loggedTrades.length} total)`}
                        </div>
                    </div>

                    {/* Empty State */}
                    {filteredAndSortedTrades.length === 0 ? (
                        <div className="py-16 text-center">
                            <Clock className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                            <p className={`text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {loggedTrades.length === 0 ? 'No trades logged yet' : 'No trades match your filters'}
                            </p>
                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="mt-3 text-sm text-blue-500 hover:text-blue-600"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1000px]">
                                    <thead>
                                        <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                            <th className="w-20 py-3 px-4"></th>
                                            <th
                                                className={`text-left py-3 px-4 text-xs uppercase tracking-wider font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                    }`}
                                                onClick={() => handleSort('date')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Date
                                                    {sortField === 'date' && <ArrowUpDown className="w-3 h-3" />}
                                                </div>
                                            </th>
                                            <th
                                                className={`text-left py-3 px-4 text-xs uppercase tracking-wider font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                    }`}
                                                onClick={() => handleSort('symbol')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Symbol
                                                    {sortField === 'symbol' && <ArrowUpDown className="w-3 h-3" />}
                                                </div>
                                            </th>
                                            <th className={`text-left py-3 px-4 text-xs uppercase tracking-wider font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                }`}>Direction</th>
                                            <th className={`text-left py-3 px-4 text-xs uppercase tracking-wider font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                }`}>Setup</th>
                                            <th
                                                className={`text-right py-3 px-4 text-xs uppercase tracking-wider font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                    }`}
                                                onClick={() => handleSort('entry')}
                                            >
                                                <div className="flex items-center justify-end gap-1">
                                                    Entry
                                                    {sortField === 'entry' && <ArrowUpDown className="w-3 h-3" />}
                                                </div>
                                            </th>
                                            <th className={`text-right py-3 px-4 text-xs uppercase tracking-wider font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                }`}>Stop</th>
                                            <th className={`text-right py-3 px-4 text-xs uppercase tracking-wider font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                }`}>Target</th>
                                            <th
                                                className={`text-right py-3 px-4 text-xs uppercase tracking-wider font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                    }`}
                                                onClick={() => handleSort('riskPercent')}
                                            >
                                                <div className="flex items-center justify-end gap-1">
                                                    Risk %
                                                    {sortField === 'riskPercent' && <ArrowUpDown className="w-3 h-3" />}
                                                </div>
                                            </th>
                                            <th className={`text-right py-3 px-4 text-xs uppercase tracking-wider font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                }`}>Size</th>
                                            <th className={`text-right py-3 px-4 text-xs uppercase tracking-wider font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                }`}>Risk Amount</th>
                                            <th
                                                className={`text-right py-3 px-4 text-xs uppercase tracking-wider font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                    }`}
                                                onClick={() => handleSort('rrRatio')}
                                            >
                                                <div className="flex items-center justify-end gap-1">
                                                    R:R
                                                    {sortField === 'rrRatio' && <ArrowUpDown className="w-3 h-3" />}
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className={`${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'} divide-y`}>
                                        {paginatedTrades.map((trade) => (
                                            <tr key={trade.id} className={`group ${isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => trade.id && onDeleteTrade(trade.id)}
                                                            className={`p-1.5 rounded-md transition-colors ${isDarkMode
                                                                ? 'text-gray-500 hover:text-rose-400 hover:bg-gray-700'
                                                                : 'text-gray-400 hover:text-rose-600 hover:bg-rose-50'
                                                                }`}
                                                            title="Delete Trade"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleRowCopy(trade)}
                                                            className={`p-1.5 rounded-md transition-colors ${isDarkMode
                                                                ? 'text-gray-500 hover:text-gray-200 hover:bg-gray-700'
                                                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                                                }`}
                                                            title="Copy Trade JSON"
                                                        >
                                                            {rowCopied === trade.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className={`py-3 px-4 text-sm whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {trade.date}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                        {trade.symbol}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${trade.direction === 'long'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-rose-100 text-rose-700'
                                                        }`}>
                                                        {trade.direction}
                                                    </span>
                                                </td>
                                                <td className={`py-3 px-4 text-sm whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {trade.setup}
                                                </td>
                                                <td className={`py-3 px-4 text-sm font-medium text-right ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                                                    {currencySymbol}{trade.entry.toFixed(2)}
                                                </td>
                                                <td className="py-3 px-4 text-sm font-medium text-right text-rose-600">
                                                    {currencySymbol}{trade.stop.toFixed(2)}
                                                </td>
                                                <td className="py-3 px-4 text-sm font-medium text-right text-emerald-600">
                                                    {trade.target ? `${currencySymbol}${trade.target.toFixed(2)}` : <span className="text-gray-400">—</span>}
                                                </td>
                                                <td className={`py-3 px-4 text-sm text-right ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                                                    {trade.riskPercent.toFixed(2)}%
                                                </td>
                                                <td className={`py-3 px-4 text-sm font-medium text-right ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                                                    {trade.positionSize.toLocaleString()}
                                                </td>
                                                <td className={`py-3 px-4 text-sm text-right ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                                                    {currencySymbol}{trade.riskAmount.toLocaleString()}
                                                </td>
                                                <td className={`py-3 px-4 text-sm font-semibold text-right ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                                    {trade.rrRatio !== null ? trade.rrRatio.toFixed(2) : <span className="text-gray-400">—</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="mt-6 flex items-center justify-between">
                                    <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Page {currentPage} of {totalPages}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className={`p-2 rounded-lg transition-colors ${currentPage === 1
                                                ? 'opacity-50 cursor-not-allowed'
                                                : isDarkMode
                                                    ? 'hover:bg-gray-700 text-gray-400'
                                                    : 'hover:bg-gray-100 text-gray-600'
                                                }`}
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>

                                        {/* Page numbers */}
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (currentPage <= 3) {
                                                    pageNum = i + 1;
                                                } else if (currentPage >= totalPages - 2) {
                                                    pageNum = totalPages - 4 + i;
                                                } else {
                                                    pageNum = currentPage - 2 + i;
                                                }

                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className={`min-w-[36px] px-3 py-1.5 rounded-lg text-sm transition-colors ${currentPage === pageNum
                                                            ? isDarkMode
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-blue-500 text-white'
                                                            : isDarkMode
                                                                ? 'hover:bg-gray-700 text-gray-400'
                                                                : 'hover:bg-gray-100 text-gray-600'
                                                            }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className={`p-2 rounded-lg transition-colors ${currentPage === totalPages
                                                ? 'opacity-50 cursor-not-allowed'
                                                : isDarkMode
                                                    ? 'hover:bg-gray-700 text-gray-400'
                                                    : 'hover:bg-gray-100 text-gray-600'
                                                }`}
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </Card>
            </main>
        </div>
    );
}
