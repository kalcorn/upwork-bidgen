// src/core/AppliedJobsManager.ts - Track jobs applied to
import fs from 'fs';
import path from 'path';

export interface AppliedJob {
  id: string;              // UpWork job ID
  title: string;           // Job title for reference
  appliedAt: string;       // ISO date when applied
  proposalPath?: string;   // Path to generated proposal file
  status: 'applied' | 'response' | 'interview' | 'rejected' | 'hired';
  notes?: string;          // Optional notes
}

export class AppliedJobsManager {
  private appliedJobsFile: string;
  private appliedJobs: Map<string, AppliedJob> = new Map();

  constructor(appliedJobsFile: string = '.applied-jobs.json') {
    this.appliedJobsFile = appliedJobsFile;
    this.loadAppliedJobs();
  }

  /**
   * Load applied jobs from file
   */
  private loadAppliedJobs(): void {
    try {
      const filePath = path.resolve(this.appliedJobsFile);
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        const appliedJobsArray: AppliedJob[] = JSON.parse(data);
        
        // Convert array to Map for O(1) lookups
        this.appliedJobs = new Map(
          appliedJobsArray.map(job => [job.id, job])
        );
      }
    } catch (error) {
      console.error('Error loading applied jobs:', error instanceof Error ? error.message : 'Unknown error');
      this.appliedJobs = new Map();
    }
  }

  /**
   * Save applied jobs to file
   */
  private saveAppliedJobs(): boolean {
    try {
      const filePath = path.resolve(this.appliedJobsFile);
      const appliedJobsArray = Array.from(this.appliedJobs.values());
      
      // Sort by application date (newest first)
      appliedJobsArray.sort((a, b) => 
        new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
      );
      
      fs.writeFileSync(filePath, JSON.stringify(appliedJobsArray, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving applied jobs:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Check if job has been applied to
   */
  hasApplied(jobId: string): boolean {
    return this.appliedJobs.has(jobId);
  }

  /**
   * Get applied job details
   */
  getAppliedJob(jobId: string): AppliedJob | undefined {
    return this.appliedJobs.get(jobId);
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
    const appliedJob: AppliedJob = {
      id: jobId,
      title,
      appliedAt: new Date().toISOString(),
      status: 'applied',
      ...(proposalPath && { proposalPath }),
      ...(notes && { notes })
    };

    this.appliedJobs.set(jobId, appliedJob);
    return this.saveAppliedJobs();
  }

  /**
   * Update job application status
   */
  updateStatus(
    jobId: string, 
    status: AppliedJob['status'], 
    notes?: string
  ): boolean {
    const existingJob = this.appliedJobs.get(jobId);
    if (!existingJob) {
      return false;
    }

    const updatedJob: AppliedJob = {
      ...existingJob,
      status,
      ...(notes && { notes })
    };

    this.appliedJobs.set(jobId, updatedJob);
    return this.saveAppliedJobs();
  }

  /**
   * Get all applied jobs
   */
  getAllAppliedJobs(): AppliedJob[] {
    return Array.from(this.appliedJobs.values());
  }

  /**
   * Get applied jobs by status
   */
  getAppliedJobsByStatus(status: AppliedJob['status']): AppliedJob[] {
    return Array.from(this.appliedJobs.values()).filter(job => job.status === status);
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    applied: number;
    responses: number;
    interviews: number;
    hired: number;
    rejected: number;
  } {
    const jobs = Array.from(this.appliedJobs.values());
    return {
      total: jobs.length,
      applied: jobs.filter(j => j.status === 'applied').length,
      responses: jobs.filter(j => j.status === 'response').length,
      interviews: jobs.filter(j => j.status === 'interview').length,
      hired: jobs.filter(j => j.status === 'hired').length,
      rejected: jobs.filter(j => j.status === 'rejected').length
    };
  }

  /**
   * Remove applied job record
   */
  removeAppliedJob(jobId: string): boolean {
    if (this.appliedJobs.has(jobId)) {
      this.appliedJobs.delete(jobId);
      return this.saveAppliedJobs();
    }
    return false;
  }
}