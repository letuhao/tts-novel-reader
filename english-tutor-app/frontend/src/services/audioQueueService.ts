/**
 * RxJS-based Audio Queue Service
 * Manages audio playback queue with RxJS streams
 */
import { Subject, Observable, EMPTY, timer, of, throwError } from 'rxjs';
import { concatMap, catchError, tap, switchMap } from 'rxjs/operators';
import { logger } from '../utils/logger';

export interface AudioQueueItem {
  messageId: string;
  chunkIndex: number; // Required: to ensure correct playback order
  audioFileId?: string; // Optional now, since we have audioData
  audioData?: string; // Base64 encoded audio data
  pause?: number;
  speakerId?: string;
  duration?: number;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
}

class AudioQueueService {
  private audioQueue$ = new Subject<AudioQueueItem>();
  private audioCache = new Map<string, { blob: Blob; url: string }>();
  private pendingQueue: AudioQueueItem[] = []; // Buffer for items waiting for their turn
  private nextExpectedIndex = 0; // Track the next chunkIndex we expect to play
  private isProcessing = false; // Track if we're currently processing the queue

  /**
   * Queue audio for playback
   * Items are buffered and played in chunkIndex order
   */
  queue(item: AudioQueueItem): void {
    logger.info('Audio queued', { 
      messageId: item.messageId, 
      chunkIndex: item.chunkIndex,
      audioFileId: item.audioFileId 
    });
    
    // Add to pending queue
    this.pendingQueue.push(item);
    
    // Sort by chunkIndex
    this.pendingQueue.sort((a, b) => a.chunkIndex - b.chunkIndex);
    
    logger.debug('Pending queue updated', { 
      queueSize: this.pendingQueue.length,
      nextExpectedIndex: this.nextExpectedIndex,
      queuedChunkIndex: item.chunkIndex,
      pendingIndices: this.pendingQueue.map(q => q.chunkIndex)
    });
    
    // Try to process queue
    this.processQueue();
  }
  
  /**
   * Process the pending queue, playing items in order
   */
  private processQueue(): void {
    // If already processing, wait for current item to complete
    if (this.isProcessing) {
      logger.debug('Queue processing in progress, waiting...', {
        nextExpectedIndex: this.nextExpectedIndex,
        pendingCount: this.pendingQueue.length
      });
      return;
    }
    
    // Find the next item to play (must match nextExpectedIndex)
    const nextItemIndex = this.pendingQueue.findIndex(
      item => item.chunkIndex === this.nextExpectedIndex
    );
    
    if (nextItemIndex === -1) {
      logger.debug('Next expected chunk not ready yet', {
        nextExpectedIndex: this.nextExpectedIndex,
        availableIndices: this.pendingQueue.map(q => q.chunkIndex)
      });
      return;
    }
    
    // Remove item from pending queue
    const nextItem = this.pendingQueue.splice(nextItemIndex, 1)[0]!;
    this.isProcessing = true;
    this.nextExpectedIndex++;
    
    logger.info('Processing audio item in order', {
      messageId: nextItem.messageId,
      chunkIndex: nextItem.chunkIndex,
      audioFileId: nextItem.audioFileId
    });
    
    // Emit to queue stream
    this.audioQueue$.next(nextItem);
  }

  /**
   * Start processing audio queue
   * Processes items sequentially - plays immediately when queued
   */
  start(): Observable<void> {
    logger.info('Audio queue processing started');
    
    return this.audioQueue$.pipe(
      // Process items sequentially with pause
      concatMap(item => {
        logger.info('Processing queued audio item', { 
          messageId: item.messageId,
          chunkIndex: item.chunkIndex,
          audioFileId: item.audioFileId,
          pause: item.pause 
        });
        
        return this.processAudioItem(item).pipe(
          // Add pause after playback completes
          switchMap(() => {
            if (item.pause && item.pause > 0) {
              logger.debug('Adding pause after audio', { 
                pause: item.pause,
                messageId: item.messageId,
                chunkIndex: item.chunkIndex
              });
              return timer(item.pause * 1000).pipe(
                switchMap(() => {
                  logger.debug('Pause completed, ready for next audio', {
                    chunkIndex: item.chunkIndex
                  });
                  return of(undefined);
                })
              );
            } else {
              logger.debug('No pause, proceeding to next audio', {
                chunkIndex: item.chunkIndex
              });
              return of(undefined);
            }
          }),
          tap(() => {
            // Mark processing as complete and try to process next item
            this.isProcessing = false;
            this.processQueue();
          }),
          catchError(error => {
            logger.error('Audio item processing error', { 
              error, 
              messageId: item.messageId,
              chunkIndex: item.chunkIndex,
              audioFileId: item.audioFileId 
            });
            // Mark processing as complete even on error, continue with next
            this.isProcessing = false;
            this.processQueue();
            return EMPTY; // Skip on error, continue with next
          })
        );
      }),
      catchError(error => {
        logger.error('Audio queue processing error', error);
        return EMPTY; // Continue processing on error
      }),
      tap(() => {
        logger.debug('Audio item fully processed (playback + pause completed)');
      })
    );
  }

  /**
   * Process a single audio item
   */
  private processAudioItem(item: AudioQueueItem): Observable<void> {
    // If audio data is provided directly (from WebSocket), use it
    if (item.audioData) {
      logger.debug('Using audio data from WebSocket', { messageId: item.messageId });
      const url = this.createAudioUrlFromBase64(item.audioData, item.audioFileId);
      return this.playAudio(url, item);
    }
    
    // Fallback: Check cache first (for backward compatibility)
    if (item.audioFileId) {
      const cached = this.audioCache.get(item.audioFileId);
      if (cached) {
        logger.debug('Using cached audio', { audioFileId: item.audioFileId });
        return this.playAudio(cached.url, item);
      }
    }
    
    // No audio data available
    logger.error('No audio data available', { messageId: item.messageId, audioFileId: item.audioFileId });
    return throwError(() => new Error('No audio data available'));
  }

  /**
   * Create audio URL from base64 data
   */
  private createAudioUrlFromBase64(base64Data: string, audioFileId?: string): string {
    // Convert base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create blob and URL
    const blob = new Blob([bytes], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    
    // Cache it if we have an audioFileId
    if (audioFileId) {
      this.audioCache.set(audioFileId, { blob, url });
      logger.debug('Audio cached from WebSocket data', { audioFileId });
    }
    
    return url;
  }

  /**
   * Play audio - returns Observable that completes when audio finishes
   */
  private playAudio(url: string, item: AudioQueueItem): Observable<void> {
    return new Observable(observer => {
      // Import useAudioStore dynamically to avoid circular dependency
      import('../store/useAudioStore').then(({ useAudioStore }) => {
        const { playAudio: playAudioFromStore } = useAudioStore.getState();
        
        logger.debug('Starting audio playback', { 
          messageId: item.messageId, 
          url,
          audioFileId: item.audioFileId 
        });
        
        // Notify play start
        item.onPlayStart?.();
        
        // Play audio and wait for it to complete
        playAudioFromStore(url, item.messageId)
          .then(() => {
            logger.info('Audio playback completed', { 
              messageId: item.messageId, 
              url,
              duration: item.duration 
            });
            // Notify play end
            item.onPlayEnd?.();
            observer.next();
            observer.complete();
          })
          .catch(error => {
            logger.error('Audio playback error', { 
              error, 
              messageId: item.messageId,
              url 
            });
            item.onPlayEnd?.();
            observer.error(error);
          });
      }).catch(error => {
        logger.error('Failed to import useAudioStore', error);
        observer.error(error);
      });
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    // Revoke object URLs
    this.audioCache.forEach(({ url }) => {
      URL.revokeObjectURL(url);
    });
    this.audioCache.clear();
    logger.debug('Audio cache cleared');
  }


  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.audioCache.size;
  }

  /**
   * Reset queue state (call when starting a new conversation)
   */
  reset(): void {
    logger.info('Resetting audio queue', {
      pendingCount: this.pendingQueue.length,
      nextExpectedIndex: this.nextExpectedIndex
    });
    this.pendingQueue = [];
    this.nextExpectedIndex = 0;
    this.isProcessing = false;
  }

  /**
   * Get queue status (for debugging)
   */
  getStatus(): { pendingCount: number; nextExpectedIndex: number; isProcessing: boolean } {
    return {
      pendingCount: this.pendingQueue.length,
      nextExpectedIndex: this.nextExpectedIndex,
      isProcessing: this.isProcessing
    };
  }
}

export const audioQueueService = new AudioQueueService();

