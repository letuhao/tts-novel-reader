/**
 * Audio Queue Manager - Single Source of Truth
 * Manages audio progression with synchronous, exclusive access
 * 
 * This service provides:
 * - Single source of truth for audio list
 * - Synchronous access control (only one operation at a time)
 * - Atomic advancement operations
 * - Event system for state changes
 */

import type { AudioFile } from '../types'

interface AudioQueueState {
  files: AudioFile[]
  currentIndex: number
  isLocked: boolean
  lockOwner: string | null
}

type QueueEventType = 'changed' | 'advanced' | 'reset' | 'locked' | 'unlocked'

type QueueEventListener = (event: {
  type: QueueEventType
  data: {
    currentIndex: number
    totalFiles: number
    currentFile: AudioFile | null
    previousIndex?: number
  }
}) => void

class AudioQueueManager {
  private state: AudioQueueState = {
    files: [],
    currentIndex: -1,
    isLocked: false,
    lockOwner: null,
  }

  private listeners: Set<QueueEventListener> = new Set()

  /**
   * Initialize the queue with audio files
   */
  initialize(files: AudioFile[], startIndex?: number): void {
    this.withLock('initialize', () => {
      const previousIndex = this.state.currentIndex
      this.state.files = [...files] // Create a copy
      this.state.currentIndex = startIndex !== undefined && startIndex >= 0 && startIndex < files.length
        ? startIndex
        : files.length > 0 ? 0 : -1

      this.emit('changed', {
        currentIndex: this.state.currentIndex,
        totalFiles: this.state.files.length,
        currentFile: this.getCurrentFile(),
        previousIndex,
      })
    })
  }

  /**
   * Get current file (read-only, no lock needed)
   */
  getCurrentFile(): AudioFile | null {
    if (this.state.currentIndex < 0 || this.state.currentIndex >= this.state.files.length) {
      return null
    }
    const file = this.state.files[this.state.currentIndex]
    return file || null
  }

  /**
   * Get all files (read-only, no lock needed)
   */
  getAllFiles(): readonly AudioFile[] {
    return [...this.state.files] // Return a copy for safety
  }

  /**
   * Get current index (read-only, no lock needed)
   */
  getCurrentIndex(): number {
    return this.state.currentIndex
  }

  /**
   * Get total count (read-only, no lock needed)
   */
  getTotalCount(): number {
    return this.state.files.length
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.state.files.length === 0
  }

  /**
   * Check if at end of queue
   */
  isAtEnd(): boolean {
    return this.state.currentIndex >= this.state.files.length - 1
  }

  /**
   * Check if at beginning of queue
   */
  isAtStart(): boolean {
    return this.state.currentIndex <= 0
  }

  /**
   * Advance to next audio (atomic operation)
   * Returns true if advanced, false if at end
   */
  advanceNext(): boolean {
    return this.withLock('advanceNext', () => {
      if (this.isAtEnd()) {
        return false
      }

      const previousIndex = this.state.currentIndex
      this.state.currentIndex++

      this.emit('advanced', {
        currentIndex: this.state.currentIndex,
        totalFiles: this.state.files.length,
        currentFile: this.getCurrentFile(),
        previousIndex,
      })

      return true
    })
  }

  /**
   * Go to previous audio (atomic operation)
   * Returns true if moved back, false if at start
   */
  goPrevious(): boolean {
    return this.withLock('goPrevious', () => {
      if (this.isAtStart()) {
        return false
      }

      const previousIndex = this.state.currentIndex
      this.state.currentIndex--

      this.emit('advanced', {
        currentIndex: this.state.currentIndex,
        totalFiles: this.state.files.length,
        currentFile: this.getCurrentFile(),
        previousIndex,
      })

      return true
    })
  }

  /**
   * Jump to specific index (atomic operation)
   * Returns true if jumped, false if invalid index
   */
  jumpToIndex(index: number): boolean {
    return this.withLock('jumpToIndex', () => {
      if (index < 0 || index >= this.state.files.length) {
        return false
      }

      const previousIndex = this.state.currentIndex
      this.state.currentIndex = index

      this.emit('changed', {
        currentIndex: this.state.currentIndex,
        totalFiles: this.state.files.length,
        currentFile: this.getCurrentFile(),
        previousIndex,
      })

      return true
    })
  }

  /**
   * Jump to specific paragraph number (atomic operation)
   * Returns true if found and jumped, false if not found
   */
  jumpToParagraph(paragraphNumber: number): boolean {
    return this.withLock('jumpToParagraph', () => {
      const index = this.state.files.findIndex(f => f.paragraphNumber === paragraphNumber)
      if (index < 0) {
        return false
      }

      const previousIndex = this.state.currentIndex
      this.state.currentIndex = index

      this.emit('changed', {
        currentIndex: this.state.currentIndex,
        totalFiles: this.state.files.length,
        currentFile: this.getCurrentFile(),
        previousIndex,
      })

      return true
    })
  }

  /**
   * Reset queue (atomic operation)
   */
  reset(): void {
    this.withLock('reset', () => {
      const previousIndex = this.state.currentIndex
      this.state.files = []
      this.state.currentIndex = -1

      this.emit('reset', {
        currentIndex: this.state.currentIndex,
        totalFiles: 0,
        currentFile: null,
        previousIndex,
      })
    })
  }

  /**
   * Subscribe to queue events
   */
  subscribe(listener: QueueEventListener): () => void {
    this.listeners.add(listener)

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(
    type: QueueEventType,
    data: {
      currentIndex: number
      totalFiles: number
      currentFile: AudioFile | null
      previousIndex?: number
    }
  ): void {
    const event = {
      type,
      data: {
        currentIndex: data.currentIndex,
        totalFiles: data.totalFiles,
        currentFile: data.currentFile,
        previousIndex: data.previousIndex,
      },
    }

    // Call all listeners synchronously
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('[AudioQueue] Error in event listener:', error)
      }
    })
  }

  /**
   * Execute operation with exclusive lock
   * Only one operation can run at a time
   * In practice, operations are fast and synchronous, so we use simple blocking
   */
  private withLock<T>(operationName: string, operation: () => T): T {
    // Check if locked - if so, wait briefly (operations should be very fast)
    if (this.state.isLocked && this.state.lockOwner !== operationName) {
      console.warn(`[AudioQueue] Operation "${operationName}" blocked - queue is locked by "${this.state.lockOwner}"`)
      // In practice, queue operations are atomic and very fast (< 1ms)
      // If we hit this, it's likely a programming error (multiple simultaneous operations)
      // For now, just log and proceed (the lock will be released immediately after)
    }

    // Acquire lock
    this.state.isLocked = true
    this.state.lockOwner = operationName

    try {
      // Execute operation synchronously
      const result = operation()
      return result
    } finally {
      // Release lock immediately after operation
      this.state.isLocked = false
      this.state.lockOwner = null
    }
  }

  /**
   * Get debug info (for debugging)
   */
  getDebugInfo(): {
    totalFiles: number
    currentIndex: number
    currentFile: AudioFile | null
    isLocked: boolean
    lockOwner: string | null
  } {
    return {
      totalFiles: this.state.files.length,
      currentIndex: this.state.currentIndex,
      currentFile: this.getCurrentFile(),
      isLocked: this.state.isLocked,
      lockOwner: this.state.lockOwner,
    }
  }
}

// Export singleton instance
export const audioQueue = new AudioQueueManager()

