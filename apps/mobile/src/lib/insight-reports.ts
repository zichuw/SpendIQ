import * as FileSystem from 'expo-file-system';

export type InsightTimeframe = 'weekly' | 'monthly' | 'yearly';

export interface InsightReport {
  id: string;
  timeframe: InsightTimeframe;
  periodLabel: string;
  summary: string;
  fileUri: string;
  createdAt: string;
}

const METADATA_PATH = `${FileSystem.documentDirectory}insight-reports.json`;
let reports: InsightReport[] = [];

function loadReports(): InsightReport[] {
  try {
    // For MVP, initialize with empty array; async file ops not available in sync context
    return [];
  } catch {
    return [];
  }
}

function saveReports(next: InsightReport[]) {
  try {
    // For MVP, store in memory only; file persistence not critical
    // In production, use FileSystem.writeAsStringAsync(METADATA_PATH, JSON.stringify(next))
  } catch {
    // no-op
  }
}

reports = loadReports();

export function addInsightReport(
  report: Omit<InsightReport, 'id' | 'createdAt'>
): InsightReport {
  const saved: InsightReport = {
    ...report,
    id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    createdAt: new Date().toISOString(),
  };
  reports = [saved, ...reports];
  saveReports(reports);
  return saved;
}

export function listInsightReports(): InsightReport[] {
  return [...reports];
}
