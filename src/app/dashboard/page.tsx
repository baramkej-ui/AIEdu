"use client";

import { useEffect, useState, useMemo } from "react";
import Link from 'next/link';
import { getStudents } from "@/lib/data";
import type { Student } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type SortKey = keyof Student | "";

function StudentTableSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 rounded-lg">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    if (user) {
      setLoading(true);
      getStudents().then((data) => {
        setStudents(data);
        setLoading(false);
      });
    }
  }, [user]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const sortedAndFilteredStudents = useMemo(() => {
    return students
      .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        if (!sortKey) return 0;
        const aValue = a[sortKey] || '';
        const bValue = b[sortKey] || '';
        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [students, searchTerm, sortKey, sortOrder]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Students Overview</CardTitle>
          <CardDescription>
            Loading student data. Please wait...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudentTableSkeleton />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Dashboard</h1>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Students Overview</CardTitle>
              <CardDescription>
                A list of your students and their recent activity.
              </CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Input
                placeholder="Filter students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-auto"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                  <div className="flex items-center">
                    Student <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                    Level-Test
                </TableHead>
                <TableHead className="hidden md:table-cell">
                   Learning
                </TableHead>
                <TableHead className="text-right">See More</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={student.avatarUrl} />
                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="font-medium">{student.name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex flex-col gap-1">
                        <Badge variant={student.levelTest.writing !== 'N/A' ? 'secondary' : 'outline'}>Writing: {student.levelTest.writing !== 'N/A' ? 'O' : 'X'}</Badge>
                        <Badge variant={student.levelTest.reading !== 'N/A' ? 'secondary' : 'outline'}>Reading: {student.levelTest.reading !== 'N/A' ? 'O' : 'X'}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {student.rolePlayHistory.length} sessions
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/student/${student.id}`}>View details</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {sortedAndFilteredStudents.length === 0 && (
            <div className="text-center p-8 text-muted-foreground">
              No students found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
