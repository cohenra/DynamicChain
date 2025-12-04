import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OnChangeFn, PaginationState, VisibilityState } from '@tanstack/react-table';
import {
  userTableSettingsService,
  UserTableSettings,
} from '@/services/user-table-settings';

/**
 * Default table settings
 */
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {};

/**
 * Debounce utility function
 * Delays execution of a function until after a specified wait time
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Hook options interface
 */
interface UseTableSettingsOptions {
  tableName: string;
  defaultPageSize?: number;
  defaultColumnVisibility?: VisibilityState;
  debounceMs?: number;
}

/**
 * Custom hook for managing persistent table settings
 *
 * Features:
 * - Fetches settings from server on mount
 * - Syncs local state with server data
 * - Debounced auto-save to prevent API spam
 * - Manages pagination and column visibility state
 *
 * @param options - Configuration options
 * @returns Table state and handlers for TanStack Table
 */
export function useTableSettings({
  tableName,
  defaultPageSize = DEFAULT_PAGE_SIZE,
  defaultColumnVisibility = DEFAULT_COLUMN_VISIBILITY,
  debounceMs = 1500,
}: UseTableSettingsOptions) {
  const queryClient = useQueryClient();

  // Local state for table settings
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    defaultColumnVisibility
  );

  // Track if settings have been initialized from server
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch settings from server
  const { data: serverSettings, isLoading } = useQuery({
    queryKey: ['tableSettings', tableName],
    queryFn: () => userTableSettingsService.getSettings(tableName),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Mutation for saving settings
  const saveSettingsMutation = useMutation({
    mutationFn: (settings: UserTableSettings) =>
      userTableSettingsService.saveSettings(tableName, settings),
    onSuccess: () => {
      // Update cache
      queryClient.setQueryData(['tableSettings', tableName], (old: UserTableSettings | null) => {
        return old;
      });
    },
  });

  // Initialize state from server settings on mount
  useEffect(() => {
    if (!isLoading && serverSettings && !isInitialized) {
      setPagination((prev) => ({
        ...prev,
        pageSize: serverSettings.pageSize || defaultPageSize,
      }));
      setColumnVisibility(serverSettings.columnVisibility || defaultColumnVisibility);
      setIsInitialized(true);
    }
  }, [serverSettings, isLoading, isInitialized, defaultPageSize, defaultColumnVisibility]);

  // Debounced save function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(
    debounce((settings: UserTableSettings) => {
      saveSettingsMutation.mutate(settings);
    }, debounceMs),
    [debounceMs]
  );

  // Save settings whenever they change (after initialization)
  const prevSettingsRef = useRef<UserTableSettings | null>(null);

  useEffect(() => {
    if (!isInitialized) return;

    const currentSettings: UserTableSettings = {
      pageSize: pagination.pageSize,
      columnVisibility,
    };

    // Only save if settings actually changed
    const prevSettings = prevSettingsRef.current;
    const hasChanged =
      !prevSettings ||
      prevSettings.pageSize !== currentSettings.pageSize ||
      JSON.stringify(prevSettings.columnVisibility) !==
        JSON.stringify(currentSettings.columnVisibility);

    if (hasChanged) {
      prevSettingsRef.current = currentSettings;
      debouncedSave(currentSettings);
    }
  }, [pagination.pageSize, columnVisibility, isInitialized, debouncedSave]);

  // Handlers for TanStack Table
  const onPaginationChange: OnChangeFn<PaginationState> = (updater) => {
    setPagination((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });
  };

  const onColumnVisibilityChange: OnChangeFn<VisibilityState> = (updater) => {
    setColumnVisibility((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });
  };

  return {
    // State
    pagination,
    columnVisibility,

    // Handlers
    onPaginationChange,
    onColumnVisibilityChange,

    // Loading state
    isLoading,
    isSaving: saveSettingsMutation.isPending,
  };
}
