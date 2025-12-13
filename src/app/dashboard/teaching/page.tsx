
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { getStudents } from "@/lib/data";
import type { Student } from "@/lib/types";
import { Calendar, Clock, User, Users, Video, Square, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { analyzeSession } from "@/ai/flows/analyze-session-flow";

type RecordingState = "idle" | "recording" | "analyzing" | "complete";
const RECORDING_DURATION = 45 * 60; // 45 minutes in seconds

export default function TeachingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [remainingTime, setRemainingTime] = useState(RECORDING_DURATION);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [report, setReport] = useState<{ evaluation: string; transcript: string } | null>(null);

  useEffect(() => {
    getStudents().then(data => {
      setStudents(data);
      setLoading(false);
    });
  }, []);

   useEffect(() => {
    const setupDevices = async () => {
      if (recordingState === 'recording') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setHasCameraPermission(true);

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          
          mediaRecorderRef.current = new MediaRecorder(stream);
          mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
          };
          mediaRecorderRef.current.start();

        } catch (error) {
          console.error('Error accessing media devices:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Media Access Denied',
            description: 'Please enable camera and microphone permissions in your browser to record.',
          });
          setRecordingState('idle');
        }
      } else {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
      }
    };

    setupDevices();

    return () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    }
  }, [recordingState, toast]);

  const handleStopRecording = async () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            
            // Do not process if the recording is empty
            if (audioBlob.size === 0) {
                toast({
                    variant: 'destructive',
                    title: 'Recording Error',
                    description: 'No audio was recorded. Please check your microphone.',
                });
                setRecordingState('idle');
                return;
            }

            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64Audio = reader.result as string;
                
                try {
                    const result = await analyzeSession({ audioDataUri: base64Audio });
                    if (result.transcript && result.evaluation) {
                        setReport({
                            evaluation: result.evaluation,
                            transcript: result.transcript,
                        });
                        setRecordingState("complete");
                    } else {
                        throw new Error("Invalid response from AI.");
                    }
                } catch (error) {
                    console.error("AI analysis failed", error);
                    toast({
                        variant: "destructive",
                        title: "AI Analysis Failed",
                        description: "Could not analyze the session. Please try again.",
                    });
                    setRecordingState("idle");
                }
            };
            audioChunksRef.current = [];
        };

        setRecordingState("analyzing");
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    if (recordingState === "recording") {
      timerRef.current = setInterval(() => {
        setRemainingTime(prevTime => {
          if (prevTime <= 1) {
            handleStopRecording();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingState]);

  const handleStartRecording = () => {
    setRemainingTime(RECORDING_DURATION);
    setReport(null);
    audioChunksRef.current = [];
    setSessionStartTime(new Date());
    setRecordingState("recording");
  };
  
  const handleSaveReport = () => {
    if (!report || !selectedStudentId || !sessionStartTime) return;

    const selectedStudent = students.find(s => s.id === selectedStudentId);
    if (!selectedStudent) return;

    const dateStr = sessionStartTime.toISOString().slice(2, 10).replace(/-/g, "");
    const timeStr = sessionStartTime.toTimeString().slice(0, 5).replace(/:/g, "");
    const teacherName = user?.displayName?.replace(/\s/g, "_") || "Teacher";
    const studentName = selectedStudent.name.replace(/\s/g, "_");

    const fileName = `${dateStr}_${timeStr}_${teacherName}_${studentName}.txt`;
    
    const fileContent = `Session Details
---------------
Date: ${sessionStartTime.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
Time: ${sessionStartTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
Teacher: ${user?.displayName || "Teacher"}
Student: ${selectedStudent.name}

---------------
Organizing the contents of the class:
${report.evaluation}

---------------
Transcript:
${report.transcript}`;
    
    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const isReadyToStart = selectedStudentId && recordingState === "idle";


  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Teaching</h1>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Start a New Session</CardTitle>
                    <CardDescription className="mt-1">
                        Prepare for a new recording session with a student.
                    </CardDescription>
                </div>
                 {recordingState === 'idle' && (
                    <Button size="sm" variant="destructive" onClick={handleStartRecording} disabled={!isReadyToStart}>
                        <Video className="mr-2 h-4 w-4" />
                        Start Recording
                    </Button>
                )}
                {recordingState === 'recording' && (
                    <Button size="sm" variant="secondary" disabled>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Recording...
                    </Button>
                )}
                 {recordingState === 'analyzing' && (
                    <Button size="sm" variant="secondary" disabled>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                    </Button>
                )}
            </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {recordingState === 'recording' && (
                <div className="space-y-2">
                    <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted />
                     {hasCameraPermission === false && (
                         <Alert variant="destructive">
                            <AlertTitle>Camera Access Required</AlertTitle>
                            <AlertDescription>
                                Please allow camera and microphone access to use this feature.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="size-4" />
                  Date
                </Label>
                <p id="date" className="font-semibold text-lg">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-4" />
                  Time Left
                </Label>
                {recordingState === 'recording' || recordingState === 'analyzing' || recordingState === 'complete' ? (
                  <p id="time" className="font-mono font-semibold text-lg bg-muted px-2 py-1 rounded-md inline-block">
                    {formatTime(remainingTime)}
                  </p>
                ) : (
                   <p id="time" className="font-semibold text-lg">
                    {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher" className="flex items-center gap-2 text-muted-foreground">
                <User className="size-4" />
                Teacher
              </Label>
              <p id="teacher" className="font-medium">{user?.displayName || "Teacher"}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student" className="flex items-center gap-2">
                <Users className="size-4" />
                Student
              </Label>
              <Select onValueChange={setSelectedStudentId} value={selectedStudentId} disabled={loading || recordingState !== 'idle'}>
                <SelectTrigger id="student">
                  <SelectValue placeholder={loading ? "Loading students..." : "Select a student"} />
                </SelectTrigger>
                <SelectContent>
                  {!loading && students.length > 0 ? (
                    students.map(student => (
                      <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="placeholder" disabled>
                      {loading ? "Loading..." : "No students available"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        {(recordingState === "recording" || recordingState === "complete" || recordingState === 'analyzing') && (
            <CardFooter className="flex-col items-start gap-4">
                 {recordingState === "recording" && (
                    <Button onClick={handleStopRecording} className="w-full">
                        <Square className="mr-2 h-4 w-4" />
                        Stop Recording
                    </Button>
                )}
                 {(recordingState === "analyzing" || recordingState === "complete") && (
                    <div className="w-full space-y-4">
                        <h3 className="text-xl font-semibold tracking-tight">Result Report</h3>

                        <Card>
                            <CardHeader>
                                <CardTitle>Session Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm text-muted-foreground">
                                {sessionStartTime && <p><strong>Date:</strong> {sessionStartTime.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>}
                                {sessionStartTime && <p><strong>Time:</strong> {sessionStartTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>}
                                <p><strong>Teacher:</strong> {user?.displayName || "Teacher"}</p>
                                <p><strong>Student:</strong> {selectedStudent?.name || "N/A"}</p>
                            </CardContent>
                        </Card>

                        <Card className="w-full">
                            <CardHeader>
                                <CardTitle>Organizing the contents of the class</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {recordingState === 'analyzing' ? <Skeleton className="h-16" /> : (
                                  <p className="text-muted-foreground whitespace-pre-wrap">{report?.evaluation || "No evaluation generated."}</p>
                                )}
                            </CardContent>
                        </Card>
                         <Card className="w-full">
                            <CardHeader>
                                <CardTitle>Transcript</CardTitle>
                            </CardHeader>
                            <CardContent>
                               <ScrollArea className="h-48">
                                {recordingState === 'analyzing' ? <Skeleton className="h-40" /> : (
                                  <p className="text-muted-foreground whitespace-pre-wrap">{report?.transcript || "No transcript generated."}</p>
                                )}
                               </ScrollArea>
                            </CardContent>
                        </Card>
                        {recordingState === "complete" && (
                             <Button onClick={handleSaveReport} className="w-full">
                                Save Report
                            </Button>
                        )}
                    </div>
                )}
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
