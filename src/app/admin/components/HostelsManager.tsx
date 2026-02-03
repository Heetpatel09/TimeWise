
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getHostels, getRooms, addHostel, updateHostel, deleteHostel, addRoom, updateRoom, deleteRoom } from '@/lib/services/hostels';
import { getStudents } from '@/lib/services/students';
import type { Hostel, Room, EnrichedRoom, Student } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function HostelsList({ hostels, onEdit, onDelete }: { hostels: Hostel[], onEdit: (h: Hostel) => void, onDelete: (id: string) => void }) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Blocks</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {hostels.map((hostel) => (
            <TableRow key={hostel.id}>
              <TableCell className="font-medium">{hostel.name}</TableCell>
              <TableCell>{hostel.blocks}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(hostel)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the hostel. Make sure all rooms are empty first.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(hostel.id)}>Continue</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function RoomsList({ rooms, students, hostels, onEdit, onDelete }: { rooms: EnrichedRoom[], students: Student[], hostels: Hostel[], onEdit: (r: Room) => void, onDelete: (id: string) => void }) {
  const unassignedStudents = students.filter(s => !rooms.some(r => r.studentId === s.id));
  
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader><TableRow><TableHead>Hostel</TableHead><TableHead>Block</TableHead><TableHead>Room</TableHead><TableHead>Student</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {rooms.map((room) => (
            <TableRow key={room.id}>
              <TableCell>{room.hostelName}</TableCell>
              <TableCell>{room.block}</TableCell>
              <TableCell>{room.roomNumber}</TableCell>
              <TableCell>{room.studentName || <span className="text-muted-foreground">Unassigned</span>}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(room)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the room assignment.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(room.id)}>Continue</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}


export default function HostelsManager() {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [rooms, setRooms] = useState<EnrichedRoom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHostelDialogOpen, setHostelDialogOpen] = useState(false);
  const [isRoomDialogOpen, setRoomDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentHostel, setCurrentHostel] = useState<Partial<Hostel>>({});
  const [currentRoom, setCurrentRoom] = useState<Partial<Room>>({});
  const { toast } = useToast();

  async function loadData() {
    setIsLoading(true);
    try {
      const [hostelData, roomData, studentData] = await Promise.all([getHostels(), getRooms(), getStudents()]);
      setHostels(hostelData);
      setRooms(roomData);
      setStudents(studentData);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleHostelSave = async () => {
    if (currentHostel && currentHostel.name && currentHostel.blocks) {
      setIsSubmitting(true);
      try {
        if (currentHostel.id) {
          await updateHostel(currentHostel as Hostel);
          toast({ title: "Hostel Updated" });
        } else {
          await addHostel(currentHostel as Omit<Hostel, 'id'>);
          toast({ title: "Hostel Added" });
        }
        await loadData();
        setHostelDialogOpen(false);
        setCurrentHostel({});
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally { setIsSubmitting(false); }
    }
  };

  const handleRoomSave = async () => {
    if (currentRoom && currentRoom.hostelId && currentRoom.roomNumber) {
      setIsSubmitting(true);
      try {
        if (currentRoom.id) {
          await updateRoom(currentRoom as Room);
          toast({ title: "Room Updated" });
        } else {
          await addRoom(currentRoom as Omit<Room, 'id'>);
          toast({ title: "Room Added" });
        }
        await loadData();
        setRoomDialogOpen(false);
        setCurrentRoom({});
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally { setIsSubmitting(false); }
    }
  };

  const unassignedStudents = students.filter(s => !rooms.some(r => r.studentId === s.id && r.id !== currentRoom?.id));

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Tabs defaultValue="rooms">
        <div className="flex justify-between items-center mb-4">
            <TabsList>
                <TabsTrigger value="rooms">Room Assignments</TabsTrigger>
                <TabsTrigger value="hostels">Manage Hostels</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
                <Button onClick={() => { setCurrentRoom({}); setRoomDialogOpen(true); }}><PlusCircle className="h-4 w-4 mr-2" />Add Room</Button>
                <Button onClick={() => { setCurrentHostel({}); setHostelDialogOpen(true); }}><PlusCircle className="h-4 w-4 mr-2" />Add Hostel</Button>
            </div>
        </div>
        <TabsContent value="rooms">
            <RoomsList rooms={rooms} students={students} hostels={hostels} onEdit={(r) => { setCurrentRoom(r); setRoomDialogOpen(true); }} onDelete={async (id) => { await deleteRoom(id); await loadData(); }} />
        </TabsContent>
        <TabsContent value="hostels">
            <HostelsList hostels={hostels} onEdit={(h) => { setCurrentHostel(h); setHostelDialogOpen(true); }} onDelete={async (id) => { await deleteHostel(id); await loadData(); }} />
        </TabsContent>

      <Dialog open={isHostelDialogOpen} onOpenChange={setHostelDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>{currentHostel?.id ? 'Edit Hostel' : 'Add Hostel'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label htmlFor="name">Hostel Name</Label><Input id="name" value={currentHostel.name ?? ''} onChange={(e) => setCurrentHostel({ ...currentHostel, name: e.target.value })} disabled={isSubmitting} /></div>
            <div className="space-y-2"><Label htmlFor="blocks">Blocks (comma-separated)</Label><Input id="blocks" value={currentHostel.blocks ?? ''} onChange={(e) => setCurrentHostel({ ...currentHostel, blocks: e.target.value })} disabled={isSubmitting} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setHostelDialogOpen(false)}>Cancel</Button><Button onClick={handleHostelSave} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isRoomDialogOpen} onOpenChange={setRoomDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>{currentRoom?.id ? 'Edit Room' : 'Add Room'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label>Hostel</Label>
                <Select value={currentRoom.hostelId} onValueChange={(v) => setCurrentRoom({ ...currentRoom, hostelId: v, block: undefined })} disabled={isSubmitting}>
                    <SelectTrigger><SelectValue placeholder="Select a hostel" /></SelectTrigger>
                    <SelectContent>{hostels.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            {currentRoom.hostelId && (hostels.find(h => h.id === currentRoom.hostelId)?.blocks || '').length > 0 &&
             <div className="space-y-2">
                <Label>Block</Label>
                <Select value={currentRoom.block || undefined} onValueChange={(v) => setCurrentRoom({ ...currentRoom, block: v })} disabled={isSubmitting}>
                    <SelectTrigger><SelectValue placeholder="Select a block" /></SelectTrigger>
                    <SelectContent>{(hostels.find(h => h.id === currentRoom.hostelId)?.blocks || '').split(',').map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
            </div>}
            <div className="space-y-2"><Label htmlFor="roomNumber">Room Number</Label><Input id="roomNumber" value={currentRoom.roomNumber ?? ''} onChange={(e) => setCurrentRoom({ ...currentRoom, roomNumber: e.target.value })} disabled={isSubmitting} /></div>
            <div className="space-y-2">
                <Label>Student</Label>
                <Select value={currentRoom.studentId || 'unassigned'} onValueChange={(v) => setCurrentRoom({ ...currentRoom, studentId: v === 'unassigned' ? null : v })} disabled={isSubmitting}>
                    <SelectTrigger><SelectValue placeholder="Assign a student" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {currentRoom.studentId && !unassignedStudents.some(s=>s.id === currentRoom.studentId) && 
                          <SelectItem value={currentRoom.studentId}>{students.find(s=>s.id === currentRoom.studentId)?.name}</SelectItem>
                        }
                        {unassignedStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setRoomDialogOpen(false)}>Cancel</Button><Button onClick={handleRoomSave} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
