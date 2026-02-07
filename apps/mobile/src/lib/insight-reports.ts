import { File, Paths } from 'expo-file-system';

export type InsightTimeframe = 'weekly' | 'monthly' | 'yearly';

export interface InsightReport {
  id: string;
  timeframe: InsightTimeframe;
  periodLabel: string;
  summary: string;
  fileUri: string;
  createdAt: string;
}

const metadataFile = new File(Paths.document, 'insight-reports.json');
let reports: InsightReport[] = [];

function loadReports(): InsightReport[] {
  try {
    if (!metadataFile.exists) return [];
    const content = metadataFile.textSync();
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? (parsed as InsightReport[]) : [];
  } catch {
    return [];
  }
}

function saveReports(next: InsightReport[]) {
  try {
    metadataFile.create({ intermediates: true, overwrite: true });
    metadataFile.write(JSON.stringify(next), { encoding: 'utf8' });
  } catch {
    // no-op for MVP
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
