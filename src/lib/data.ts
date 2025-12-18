
import type { Student, HistoryItem, LevelTestGrade, LoginRecord } from "./types";
import { collection, query, where, getDocs, getFirestore, Timestamp, doc, getDoc, orderBy, addDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { app } from './firebase/config';

const db = getFirestore(app);

function formatTimestamp(timestamp: Timestamp | undefined, includeTime: boolean = true): string {
    if (!timestamp) {
        return '-';
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
      const selfStudyHistory: HistoryItem[] = [];
      const levelTestGrades: { writing?: string, reading?: string } = {};

      activitiesSnapshot.docs.forEach(activityDoc => {
        const activityData = activityDoc.data();
        const activityType = activityData.type;

        const baseItem = {
          id: activityDoc.id,
          date: formatTimestamp(activityData.timestamp, false),
          activity: activityData.details,
          historyId: activityData.historyId || activityData.selfStudyHistoryId,
        };

        if (activityType === 'Level Test') {
            const item: HistoryItem = {
              ...baseItem,
              type: 'Level Test',
              score: activityData.result,
            };
            levelTestHistory.push(item);
            if (activityData.details === 'Writing' && !levelTestGrades.writing) {
                levelTestGrades.writing = activityData.result;
            }
            if (activityData.details === 'Reading' && !levelTestGrades.reading) {
                levelTestGrades.reading = activityData.result;
            }
        } else if (activityType === 'Learning') {
            const item: HistoryItem = {
              ...baseItem,
              type: 'Learning',
            };
            rolePlayHistory.push(item);
        } else if (activityType === 'Self-Study') {
            const item: HistoryItem = {
                ...baseItem,
                type: 'Self-Study',
                score: activityData.result,
            };
            selfStudyHistory.push(item);
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
        selfStudyHistory,
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
      const selfStudyHistory: HistoryItem[] = [];
      const levelTestGrades: { writing?: string, reading?: string } = {};

      activitiesSnapshot.docs.forEach(activityDoc => {
        const activityData = activityDoc.data();
        const activityType = activityData.type;
        
        const baseItem = {
          id: activityDoc.id,
          date: formatTimestamp(activityData.timestamp, false),
          activity: activityData.details,
          duration: activityData.duration ? `${Math.round(activityData.duration / 60)} min` : undefined,
          historyId: activityData.historyId || activityData.selfStudyHistoryId,
        };

        if (activityType === 'Level Test') {
            const item: HistoryItem = { ...baseItem, type: 'Level Test', score: activityData.result };
            levelTestHistory.push(item);
            if (activityData.details === 'Writing' && !levelTestGrades.writing) {
                levelTestGrades.writing = activityData.result;
            }
            if (activityData.details === 'Reading' && !levelTestGrades.reading) {
                levelTestGrades.reading = activityData.result;
            }
        } else if (activityType === 'Learning') {
            const item: HistoryItem = { ...baseItem, type: 'Learning' };
            rolePlayHistory.push(item);
        } else if (activityType === 'Self-Study') {
            const item: HistoryItem = { ...baseItem, type: 'Self-Study', score: activityData.result };
            selfStudyHistory.push(item);
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
        selfStudyHistory: selfStudyHistory,
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

export async function getSelfStudyReport(studentId: string, historyId: string): Promise<any> {
    try {
        const reportRef = doc(db, 'users', studentId, 'selfStudyHistory', historyId);
        const reportSnap = await getDoc(reportRef);
        if (reportSnap.exists()) {
            return reportSnap.data();
        }
        return null;
    } catch (error) {
        console.error("Error fetching self study report: ", error);
        return null;
    }
}

export async function getTeachingSessions(teacherId: string) {
    if (!teacherId) return [];
    try {
        const sessionsRef = collection(db, 'teachingSessions');
        const q = query(
            sessionsRef, 
            where('teacherId', '==', teacherId),
            orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const sessions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return sessions;
    } catch (error) {
        console.error("Error fetching teaching sessions:", error);
        return [];
    }
}


export async function saveTeachingSession(sessionData: any) {
  const sessionWithTimestamp = {
    ...sessionData,
    createdAt: serverTimestamp()
  };
  const sessionsRef = collection(db, 'teachingSessions');
  await addDoc(sessionsRef, sessionWithTimestamp);
}

export async function saveLoginHistory(userId: string) {
  const userRef = doc(db, 'users', userId);
  
  // Update last login and total logins on the user document
  await setDoc(userRef, {
    lastLogin: serverTimestamp(),
    totalLogins: increment(1)
  }, { merge: true });

  // Add a new login record to the subcollection
  const loginHistoryRef = collection(userRef, 'loginHistory');
  await addDoc(loginHistoryRef, {
    timestamp: serverTimestamp()
  });
}

export async function getLoginHistory(userId: string): Promise<LoginRecord[]> {
  try {
    const loginHistoryRef = collection(db, 'users', userId, 'loginHistory');
    const q = query(loginHistoryRef, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        timestamp: data.timestamp,
      };
    });
  } catch (error) {
    console.error("Error fetching login history: ", error);
    return [];
  }
}

    