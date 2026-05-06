export interface SubjectStat {
  code: string;
  name: string;
  A1: number;
  A2: number;
  B1: number;
  B2: number;
  C1: number;
  C2: number;
  D: number; 
  E: number; 
  totalPresent: number;
  passCount: number;
  pointsEarned: number;
  maxPoints: number;
  pi: number;
  passPercentage: number;
}

export interface ParseResult {
  subjects: Record<string, SubjectStat>;
  schoolPI: number;
  totalStudents: number;
  overallPassPercentage: number;
}

export const SUBJECT_MAP: Record<string, string> = {
  "301": "English Core",
  "302": "Hindi Core",
  "041": "Mathematics",
  "042": "Physics",
  "043": "Chemistry",
  "044": "Biology",
  "048": "Physical Education",
  "083": "Computer Science",
  "030": "Economics",
  "054": "Business Studies",
  "055": "Accountancy",
  "027": "History",
  "028": "Political Science",
  "029": "Geography",
  "037": "Psychology",
  "039": "Sociology",
  "065": "Informatics Prac.",
  "034": "Hind.Music Vocal",
  "049": "Painting",
  "074": "Legal Studies",
  "322": "Sanskrit Core",
  "002": "Hindi Elective",
  "001": "English Elective",
};
