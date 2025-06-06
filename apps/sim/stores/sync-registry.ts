'use client'

import { createLogger } from '@/lib/logs/console-logger'
import { SyncManager } from './sync'
import { isLocalStorageMode } from './sync-core'
import {
  fetchWorkflowsFromDB,
  isRegistryInitialized,
  resetRegistryInitialization,
  workflowSync,
} from './workflows/sync'

const logger = createLogger('SyncRegistry')

// Initialize managers lazily
let initialized = false
let initializing = false
let managers: SyncManager[] = []

/**
 * Initialize sync managers and fetch data from DB
 * Returns a promise that resolves when initialization is complete
 *
 * Note: Workflow scheduling is handled automatically by the workflowSync manager
 * when workflows are synced to the database. The scheduling logic checks if a
 * workflow has scheduling enabled in its starter block and updates the schedule
 * accordingly.
 */
export async function initializeSyncManagers(): Promise<boolean> {
  // Skip if already initialized or initializing
  if (initialized || initializing) {
    return initialized
  }

  initializing = true

  try {
    // Skip DB sync in local storage mode
    if (isLocalStorageMode()) {
      managers = [workflowSync]
      initialized = true
      return true
    }

    // Initialize sync managers
    managers = [workflowSync]

    // Reset registry initialization state before fetching
    resetRegistryInitialization()

    // Fetch data from DB
    try {
      // Remove environment variables fetch
      await fetchWorkflowsFromDB()

      // Wait for a short period to ensure registry is properly initialized
      if (!isRegistryInitialized()) {
        logger.info('Waiting for registry initialization to complete...')
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      // Verify initialization complete
      if (!isRegistryInitialized()) {
        logger.warn('Registry initialization may not have completed properly')
      } else {
        logger.info('Registry initialization verified')
      }
    } catch (error) {
      logger.error('Error fetching data from DB:', { error })
    }

    initialized = true
    return true
  } catch (error) {
    logger.error('Error initializing sync managers:', { error })
    return false
  } finally {
    initializing = false
  }
}

/**
 * Check if sync managers are initialized
 */
export function isSyncInitialized(): boolean {
  return initialized && isRegistryInitialized()
}

/**
 * Get all sync managers
 */
export function getSyncManagers(): SyncManager[] {
  return managers
}

/**
 * Reset all sync managers
 */
export function resetSyncManagers(): void {
  initialized = false
  initializing = false
  managers = []
  resetRegistryInitialization()
}

// Export individual sync managers for direct use
export { workflowSync }
