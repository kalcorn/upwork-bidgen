// src/core/JobsManager.ts - Track job interactions
import fs from 'fs';
import path from 'path';

export interface TrackedJob {
  id: string;              // UpWork job ID
  title: string;           // Job title for reference
  trackedAt: string;       // ISO date when first tracked
  proposalPath?: string;   // Path to generated proposal file
  status: 'interested' | 'applied' | 'response' | 'interview' | 'rejected' | 'hired' | 'not-interested';
  notes?: string;          // Optional notes
}

export class JobsManager {
  private jobsFile: string;
  private trackedJobs: Map<string, TrackedJob> = new Map();

  constructor(jobsFile: string = '.jobs.json') {
    this.jobsFile = jobsFile;
    this.loadTrackedJobs();
  }

  /**
   * Load tracked jobs from file
   */
  private loadTrackedJobs(): void {
    try {
      const filePath = path.resolve(this.jobsFile);
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        const trackedJobsArray: TrackedJob[] = JSON.parse(data);
        
        // Convert array to Map for O(1) lookups
        this.trackedJobs = new Map(
          trackedJobsArray.map(job => [job.id, job])
        );
      }
    } catch (error) {
      console.error('Error loading tracked jobs:', error instanceof Error ? error.message : 'Unknown error');
      this.trackedJobs = new Map();
    }
  }

  /**
   * Save tracked jobs to file
   */
  private saveTrackedJobs(): boolean {
    try {
      const filePath = path.resolve(this.jobsFile);
      const trackedJobsArray = Array.from(this.trackedJobs.values());
      
      // Sort by tracked date (newest first)
      trackedJobsArray.sort((a, b) => 
        new Date(b.trackedAt).getTime() - new Date(a.trackedAt).getTime()
      );
      
      fs.writeFileSync(filePath, JSON.stringify(trackedJobsArray, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving tracked jobs:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Check if job is being tracked
   */
  isTracked(jobId: string): boolean {
    return this.trackedJobs.has(jobId);
  }

  /**
   * Check if job has been applied to
   */
  hasApplied(jobId: string): boolean {
    const job = this.trackedJobs.get(jobId);
    return job?.status === 'applied' || job?.status === 'response' || job?.status === 'interview' || job?.status === 'hired';
  }

  /**
   * Check if job is marked as not interested
   */
  isNotInterested(jobId: string): boolean {
    const job = this.trackedJobs.get(jobId);
    return job?.status === 'not-interested';
  }

  /**
   * Get tracked job details
   */
  getTrackedJob(jobId: string): TrackedJob | undefined {
    return this.trackedJobs.get(jobId);
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

    this.trackedJobs.set(jobId, trackedJob);
    return this.saveTrackedJobs();
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

    this.trackedJobs.set(jobId, trackedJob);
    return this.saveTrackedJobs();
  }

  /**
   * Update job status
   */
  updateStatus(
    jobId: string, 
    status: TrackedJob['status'], 
    notes?: string
  ): boolean {
    const existingJob = this.trackedJobs.get(jobId);
    if (!existingJob) {
      return false;
    }

    const updatedJob: TrackedJob = {
      ...existingJob,
      status,
      ...(notes && { notes })
    };

    this.trackedJobs.set(jobId, updatedJob);
    return this.saveTrackedJobs();
  }

  /**
   * Get all tracked jobs
   */
  getAllTrackedJobs(): TrackedJob[] {
    return Array.from(this.trackedJobs.values());
  }

  /**
   * Get tracked jobs by status
   */
  getTrackedJobsByStatus(status: TrackedJob['status']): TrackedJob[] {
    return Array.from(this.trackedJobs.values()).filter(job => job.status === status);
  }

  /**
   * Get jobs eligible for search results (not applied, not not-interested)
   */
  getEligibleJobs(): TrackedJob[] {
    return Array.from(this.trackedJobs.values()).filter(job => 
      job.status === 'interested' || job.status === 'rejected'
    );
  }

  /**
   * Check if job should be filtered from search results
   */
  shouldFilterFromSearch(jobId: string): boolean {
    const job = this.trackedJobs.get(jobId);
    if (!job) return false;
    return job.status === 'not-interested' || job.status === 'applied' || 
           job.status === 'response' || job.status === 'interview' || job.status === 'hired';
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
    const jobs = Array.from(this.trackedJobs.values());
    return {
      total: jobs.length,
      interested: jobs.filter(j => j.status === 'interested').length,
      applied: jobs.filter(j => j.status === 'applied').length,
      responses: jobs.filter(j => j.status === 'response').length,
      interviews: jobs.filter(j => j.status === 'interview').length,
      hired: jobs.filter(j => j.status === 'hired').length,
      rejected: jobs.filter(j => j.status === 'rejected').length,
      notInterested: jobs.filter(j => j.status === 'not-interested').length
    };
  }

  /**
   * Remove tracked job record
   */
  removeTrackedJob(jobId: string): boolean {
    if (this.trackedJobs.has(jobId)) {
      this.trackedJobs.delete(jobId);
      return this.saveTrackedJobs();
    }
    return false;
  }
}