export interface StudentMarks {
  usn: string;
  name: string;
  subjects: Record<string, number>;
}

export interface ComparisonData {
  usn: string;
  name: string;
  subjects: string[];
  actual: Record<string, number>;
  predicted: Record<string, number>;
  totalError: number;
  averageAccuracy: number; // 0-100 scale
}

export interface SubjectStat {
  subject: string;
  meanActual: number;
  meanPredicted: number;
  mae: number;
  rmse: number;
}

export interface OverallAnalysis {
  mae: number;
  rmse: number;
  r2: number;
  subjectStats: SubjectStat[];
}

export interface DatasetAnalysis {
  overallAccuracy: number;
  students: ComparisonData[];
  subjectList: string[];
  overall: OverallAnalysis;
}

export interface ParsedFile {
  data: StudentMarks[];
  subjects: string[];
}