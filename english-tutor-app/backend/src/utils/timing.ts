/**
 * Timing Utility
 * Helper functions for performance measurement
 */

export interface TimingResult {
  label: string;
  timeMs: number;
  percentage?: number;
}

export class PerformanceTimer {
  private startTime: number;
  private checkpoints: Array<{ label: string; time: number }> = [];

  constructor(label?: string) {
    this.startTime = Date.now();
    if (label) {
      this.checkpoint(label);
    }
  }

  checkpoint(label: string): void {
    this.checkpoints.push({
      label,
      time: Date.now(),
    });
  }

  getResults(): TimingResult[] {
    const totalTime = Date.now() - this.startTime;
    const results: TimingResult[] = [];

    let lastTime = this.startTime;
    for (const checkpoint of this.checkpoints) {
      const timeMs = checkpoint.time - lastTime;
      results.push({
        label: checkpoint.label,
        timeMs,
        percentage: (timeMs / totalTime) * 100,
      });
      lastTime = checkpoint.time;
    }

    // Add total
    results.push({
      label: 'TOTAL',
      timeMs: totalTime,
      percentage: 100,
    });

    return results;
  }

  logResults(logger: { info: (obj: unknown, msg: string) => void }): void {
    const results = this.getResults();
    logger.info(
      {
        timings: results.map((r) => ({
          label: r.label,
          timeMs: r.timeMs,
          percentage: r.percentage?.toFixed(1) + '%',
        })),
      },
      '⏱️ Performance timings'
    );
  }
}

