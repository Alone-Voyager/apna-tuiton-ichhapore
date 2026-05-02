export interface Test {
  id: string;
  test_name: string;
  type: string;
  total_marks: number;
  subject: string;
  test_date: string;
  class_id?: string;
  classes: { id: string; name: string } | null;
  test_results: any[];
  paper_path?: string | null;
}

export interface ClassData {
  id: string;
  name: string;
}

export interface StudentResult {
  student: any;
  result: any;
}

export interface EnrichedClass extends ClassData {
  totalStudents: number;
  totalTests: number;
  pendingEvals: number;
}
