import type { Student, HistoryItem, LevelTestGrade } from "./types";
import { collection, query, where, getDocs, getFirestore, Timestamp, doc, getDoc, orderBy } from 'firebase/firestore';
import { app } from './firebase/config';

const db = getFirestore(app);

function formatTimestamp(timestamp: Timestamp | undefined, includeTime: boolean = true): string {
    if (!timestamp) {
        return 'N/A';
    }
    const date = timestamp.toDate();
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    };
    if (includeTime) {
        options.hour = 'numeric';
        options.minute = 'numeric';
        options.hour12 = true;
    }
    return new Intl.DateTimeFormat('en-US', options).format(date);
}

export async function getStudents(): Promise<Student[]> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'student'));
    const querySnapshot = await getDocs(q);

    const studentsPromises = querySnapshot.docs.map(async (userDoc) => {
      const data = userDoc.data();
      const studentId = userDoc.id;

      const activitiesRef = collection(db, 'users', studentId, 'activities');
      const activitiesQuery = query(activitiesRef, orderBy('timestamp', 'desc'));
      const activitiesSnapshot = await getDocs(activitiesQuery);

      const levelTestHistory: HistoryItem[] = [];
      const rolePlayHistory: HistoryItem[] = [];
      const levelTestGrades: { writing?: string, reading?: string } = {};

      activitiesSnapshot.docs.forEach(activityDoc => {
        const activityData = activityDoc.data();
        if (activityData.type === 'Level Test') {
            const item: HistoryItem = {
              id: activityDoc.id,
              date: formatTimestamp(activityData.timestamp, false),
              activity: activityData.details,
              score: activityData.result,
              historyId: activityData.historyId,
            };
            levelTestHistory.push(item);
            if (activityData.details === 'Writing' && !levelTestGrades.writing) {
                levelTestGrades.writing = activityData.result;
            }
            if (activityData.details === 'Reading' && !levelTestGrades.reading) {
                levelTestGrades.reading = activityData.result;
            }
        } else if (activityData.type === 'Learning') {
            const item: HistoryItem = {
              id: activityDoc.id,
              date: formatTimestamp(activityData.timestamp, false),
              activity: activityData.details,
              historyId: activityData.historyId,
            };
            rolePlayHistory.push(item);
        }
      });
      
      return { 
        id: studentId, 
        name: data.name || `Student${studentId.substring(0,4)}`,
        avatarUrl: data.avatarUrl || `https://picsum.photos/seed/${studentId}/40/40`,
        email: data.email || '',
        role: data.role || 'student',
        totalLogins: data.totalLogins || 0,
        lastLogin: formatTimestamp(data.lastLogin as Timestamp | undefined),
        levelTest: { 
            writing: levelTestGrades.writing || 'N/A', 
            reading: levelTestGrades.reading || 'N/A' 
        },
        levelTestHistory,
        rolePlayHistory,
      } as Student
    });
    
    const students = await Promise.all(studentsPromises);
    return students;
  } catch (error) {
    console.error("Error fetching students: ", error);
    return [];
  }
}


export async function getStudentById(studentId: string): Promise<Student | null> {
  try {
    const docRef = doc(db, 'users', studentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      const activitiesRef = collection(db, 'users', studentId, 'activities');
      const activitiesQuery = query(activitiesRef, orderBy('timestamp', 'desc'));
      const activitiesSnapshot = await getDocs(activitiesQuery);
      
      const levelTestHistory: HistoryItem[] = [];
      const rolePlayHistory: HistoryItem[] = [];
      const levelTestGrades: { writing?: string, reading?: string } = {};

      activitiesSnapshot.docs.forEach(activityDoc => {
        const activityData = activityDoc.data();
        const item: HistoryItem = {
          id: activityDoc.id,
          date: formatTimestamp(activityData.timestamp, false),
          activity: activityData.details,
          score: activityData.result,
          duration: activityData.duration ? `${Math.round(activityData.duration / 60)} min` : undefined,
          historyId: activityData.historyId,
        };

        if (activityData.type === 'Level Test') {
          levelTestHistory.push(item);
          if (activityData.details === 'Writing' && !levelTestGrades.writing) {
            levelTestGrades.writing = activityData.result;
          }
          if (activityData.details === 'Reading' && !levelTestGrades.reading) {
            levelTestGrades.reading = activityData.result;
          }
        } else if (activityData.type === 'Learning') {
          rolePlayHistory.push(item);
        }
      });
      
      const studentData: Student = {
        id: docSnap.id, 
        name: data.name || `Student${docSnap.id.substring(0,4)}`,
        avatarUrl: data.avatarUrl || `https://picsum.photos/seed/${docSnap.id}/64/64`,
        email: data.email || '',
        role: data.role || 'student',
        totalLogins: data.totalLogins || 0,
        lastLogin: formatTimestamp(data.lastLogin as Timestamp | undefined),
        levelTest: {
          writing: levelTestGrades.writing || 'N/A',
          reading: levelTestGrades.reading || 'N/A'
        },
        levelTestHistory: levelTestHistory,
        rolePlayHistory: rolePlayHistory,
      };

      return studentData;

    } else {
      console.log("No such document!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching student details: ", error);
    return null;
  }
}


export async function getRolePlayReport(studentId: string, historyId: string): Promise<any> {
    try {
        const reportRef = doc(db, 'users', studentId, 'rolePlayHistory', historyId);
        const reportSnap = await getDoc(reportRef);
        if (reportSnap.exists()) {
            return reportSnap.data();
        }
        return null;
    } catch (error) {
        console.error("Error fetching role play report: ", error);
        return null;
    }
}