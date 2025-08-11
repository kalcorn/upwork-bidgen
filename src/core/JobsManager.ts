// src/core/JobsManager.ts - Track job interactions using unified config
import { ConfigManager, TrackedJob } from './ConfigManager';

export { TrackedJob };

export class JobsManager {
  private configManager: ConfigManager;

  constructor(configFile: string = 'bidgen.json') {
    this.configManager = new ConfigManager(configFile);
  }

  /**
   * Get tracked jobs from unified config
   */
  private getTrackedJobs(): TrackedJob[] {
    return this.configManager.getTrackedJobs();
  }

  /**
   * Check if job is being tracked
   */
  isTracked(jobId: string): boolean {
    return this.configManager.isJobTracked(jobId);
  }

  /**
   * Check if job has been applied to
   */
  hasApplied(jobId: string): boolean {
    const job = this.getTrackedJob(jobId);
    return job?.status === 'applied' || job?.status === 'response' || job?.status === 'interview' || job?.status === 'hired';
  }

  /**
   * Check if job is marked as not interested
   */
  isNotInterested(jobId: string): boolean {
    const job = this.getTrackedJob(jobId);
    return job?.status === 'not-interested';
  }

  /**
   * Get tracked job details
   */
  getTrackedJob(jobId: string): TrackedJob | undefined {
    return this.getTrackedJobs().find(job => job.id === jobId);
  }

  /**
   * Mark job as not interested
   */
  markAsNotInterested(
    jobId: string, 
    title: string, 
    notes?: string
  ): boolean {
    const trackedJob: TrackedJob = {
      id: jobId,
      title,
      trackedAt: new Date().toISOString(),
      status: 'not-interested',
      ...(notes && { notes })
    };

    return this.configManager.addTrackedJob(trackedJob);
  }

  /**
   * Mark job as applied
   */
  markAsApplied(
    jobId: string, 
    title: string, 
    proposalPath?: string, 
    notes?: string
  ): boolean {
    const trackedJob: TrackedJob = {
      id: jobId,
      title,
      trackedAt: new Date().toISOString(),
      status: 'applied',
      ...(proposalPath && { proposalPath }),
      ...(notes && { notes })
    };

    return this.configManager.addTrackedJob(trackedJob);
  }

  /**
   * Update job status
   */
  updateStatus(
    jobId: string, 
    status: TrackedJob['status'], 
    notes?: string
  ): boolean {
    return this.configManager.updateJobStatus(jobId, status, notes);
  }

  /**
   * Get all tracked jobs
   */
  getAllTrackedJobs(): TrackedJob[] {
    return this.getTrackedJobs();
  }

  /**
   * Get tracked jobs by status
   */
  getTrackedJobsByStatus(status: TrackedJob['status']): TrackedJob[] {
    return this.getTrackedJobs().filter(job => job.status === status);
  }

  /**
   * Get jobs eligible for search results (not applied, not not-interested)
   */
  getEligibleJobs(): TrackedJob[] {
    return this.getTrackedJobs().filter(job => 
      job.status === 'interested' || job.status === 'rejected'
    );
  }

  /**
   * Check if job should be filtered from search results
   */
  shouldFilterFromSearch(jobId: string): boolean {
    return this.configManager.shouldFilterFromSearch(jobId);
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    interested: number;
    applied: number;
    responses: number;
    interviews: number;
    hired: number;
    rejected: number;
    notInterested: number;
  } {
    return this.configManager.getJobStats();
  }
}