import { api } from './api';

/**
 * User table settings interface
 * Stores pagination and column visibility preferences per table
 */
export interface UserTableSettings {
  pageSize: number;
  columnVisibility: Record<string, boolean>;
}

/**
 * API response interface for user table settings
 */
export interface UserTableSettingResponse {
  id: number;
  user_id: number;
  table_name: string;
  settings_json: UserTableSettings;
  created_at: string;
  updated_at: string;
}

/**
 * Service for managing user table settings
 * Handles GET and PUT operations for persisting table preferences
 */
export const userTableSettingsService = {
  /**
   * Fetch table settings for a specific table
   * @param tableName - Unique identifier for the table
   * @returns User table settings or null if not found
   */
  async getSettings(tableName: string): Promise<UserTableSettings | null> {
    try {
      const response = await api.get<UserTableSettingResponse>(
        `/api/user-table-settings/${tableName}`
      );
      return response.data.settings_json;
    } catch (error: any) {
      // Return null if settings don't exist yet (404)
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Save or update table settings
   * @param tableName - Unique identifier for the table
   * @param settings - Settings object to save
   */
  async saveSettings(
    tableName: string,
    settings: UserTableSettings
  ): Promise<UserTableSettingResponse> {
    const response = await api.put<UserTableSettingResponse>(
      `/api/user-table-settings/${tableName}`,
      { settings_json: settings }
    );
    return response.data;
  },

  /**
   * Delete table settings
   * @param tableName - Unique identifier for the table
   */
  async deleteSettings(tableName: string): Promise<void> {
    await api.delete(`/api/user-table-settings/${tableName}`);
  },
};
