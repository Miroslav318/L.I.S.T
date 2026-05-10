export type Course = {
    id: number;
    name: string;
    periodName: string;
    capacity: number;
    groupChangeDeadline: string | null;
    enrollmentLimit: string | null;
    hiddenInList: boolean;
    autoAcceptStudents: boolean;
    imageUrl?: string;
    teacherName: string;

    isMine?: boolean;
    allowed?: boolean;
    onJoined?: (courseId: number) => void;
    currentEnrollment: number;
    description?: string;
  };
