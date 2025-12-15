"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getStudentById, getRolePlayReport, getSelfStudyReport } from "@/lib/data";
import type { Student, HistoryItem } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

function HistoryTable({ title, items, columns, onReportClick }: { title: string, items: HistoryItem[], columns: { key: keyof HistoryItem, label: string }[], onReportClick?: (item: HistoryItem) => void }) {
  return (
     <AccordionItem value={title}>
      <AccordionTrigger className="text-lg font-semibold px-6">{title}</AccordionTrigger>
      <AccordionContent>
        <div className="px-6 pb-4">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(col => <TableHead key={col.key}>{col.label}</TableHead>)}
               {onReportClick && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length > 0 ? (
              items.map((item) => (
                <TableRow key={item.id}>
                  {columns.map(col => <TableCell key={col.key}>{item[col.key] as string}</TableCell>)}
                  {onReportClick && (
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => onReportClick(item)}>View Report</Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + (onReportClick ? 1 : 0)} className="text-center">
                  No history found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}


export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params.id as string;
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [selectedReportType, setSelectedReportType] = useState<'role-play' | 'self-study' | null>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);

  useEffect(() => {
    if (studentId) {
      setLoading(true);
      getStudentById(studentId).then((data) => {
        setStudent(data);
        setLoading(false);
      });
    }
  }, [studentId]);

  const handleViewReport = async (item: HistoryItem) => {
    if (!item.historyId) return;
    setIsReportLoading(true);
    setSelectedReport(null); // Clear previous report
    
    try {
      let reportData;
      if (item.type === 'Learning') {
        reportData = await getRolePlayReport(studentId, item.historyId);
        setSelectedReportType('role-play');
      } else if (item.type === 'Self-Study') {
        reportData = await getSelfStudyReport(studentId, item.historyId);
        setSelectedReportType('self-study');
      }
      setSelectedReport(reportData);
    } catch(error) {
      console.error("Failed to load report", error)
    } finally {
        setIsReportLoading(false);
    }
  };

  const closeDialog = () => {
      setSelectedReport(null);
      setSelectedReportType(null);
  }

  if (loading) {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-8 w-48" />
            </div>
            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </CardHeader>
                <CardContent>
                     <Skeleton className="h-10 w-64" />
                </CardContent>
            </Card>
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
  }

  if (!student) {
    return (
        <div className="text-center p-8">
            <h2 className="text-2xl font-semibold mb-4">Student Not Found</h2>
            <p className="text-muted-foreground mb-4">The student you are looking for does not exist.</p>
            <Button asChild>
                <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
        </div>
    );
  }
  
  const levelTestColumns = [
    { key: 'date' as keyof HistoryItem, label: 'Date' },
    { key: 'activity' as keyof HistoryItem, label: 'Activity' },
    { key: 'score' as keyof HistoryItem, label: 'Score' },
  ];

  const rolePlayColumns = [
    { key: 'date' as keyof HistoryItem, label: 'Date' },
    { key: 'activity' as keyof HistoryItem, label: 'Activity' },
  ];

  const selfStudyColumns = [
    { key: 'date' as keyof HistoryItem, label: 'Date' },
    { key: 'activity' as keyof HistoryItem, label: 'Activity' },
    { key: 'score' as keyof HistoryItem, label: 'Score' },
  ];

  const renderReportContent = () => {
    if (isReportLoading) {
      return (
        <div className="space-y-4 py-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-8 w-1/4 mt-4" />
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }

    if (!selectedReport) {
      return <p className="text-center text-muted-foreground py-10">No report data to display.</p>;
    }

    if (selectedReportType === 'role-play') {
      return (
        <div className="space-y-4 py-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">Evaluation</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedReport.evaluation}</p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">Transcript</h3>
            <div className="space-y-2">
              {selectedReport.messages?.map((msg: any, index: number) => (
                <div key={index} className={`text-sm ${msg.role === 'user' ? 'text-blue-600' : 'text-green-600'}`}>
                  <strong>{msg.role === 'user' ? student.name : 'AI'}:</strong> {msg.content}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    
    if (selectedReportType === 'self-study') {
      return (
        <div className="space-y-4 py-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">Evaluation</h3>
            <div className="p-4 border rounded-md bg-secondary/50">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedReport.evaluation?.feedback}</p>
                <div className="flex gap-4 mt-4">
                    <Badge>Score: {selectedReport.evaluation?.score}</Badge>
                    <Badge variant="outline">CEFR Level: {selectedReport.evaluation?.cefrLevel}</Badge>
                </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">Problem & Answer</h3>
            <div className="space-y-4">
                <div>
                    <h4 className="font-medium">Problem Statement</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1 p-2 border rounded-md">{selectedReport.problem?.problem}</p>
                </div>
                 <div>
                    <h4 className="font-medium">Student's Answer</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1 p-2 border rounded-md">{selectedReport.userAnswers?.join('\n')}</p>
                </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
         <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
            </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">{student.name}'s Details</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={student.avatarUrl} />
            <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{student.name}</CardTitle>
            <CardDescription>{student.email}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
            <h3 className="text-lg font-semibold mb-2">Level Test Grades</h3>
            <div className="flex gap-4">
                <Badge variant="secondary" className="text-base px-4 py-2">Writing: {student.levelTest.writing}</Badge>
                <Badge variant="secondary" className="text-base px-4 py-2">Reading: {student.levelTest.reading}</Badge>
            </div>
        </CardContent>
      </Card>
      
      <Card>
        <Accordion type="multiple" className="w-full">
            <HistoryTable title="Level Test History" items={student.levelTestHistory} columns={levelTestColumns} />
            <HistoryTable title="Self-Study History" items={student.selfStudyHistory} columns={selfStudyColumns} onReportClick={handleViewReport} />
            <HistoryTable title="Role-Play History" items={student.rolePlayHistory} columns={rolePlayColumns} onReportClick={handleViewReport} />
        </Accordion>
      </Card>

        <Dialog open={isReportLoading || selectedReport !== null} onOpenChange={(open) => !open && closeDialog()}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{selectedReportType === 'role-play' ? 'Role-Play' : 'Self-Study'} Report</DialogTitle>
                    <DialogDescription>
                        This is the evaluation and details from the session.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 pr-4 -mr-4">
                    {renderReportContent()}
                </ScrollArea>
                 <DialogClose asChild>
                    <Button type="button" variant="secondary" className="mt-4">
                        Close
                    </Button>
                </DialogClose>
            </DialogContent>
        </Dialog>
    </div>
  );
}
