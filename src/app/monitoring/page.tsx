
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Loader2, Eye, PlayCircle, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useAppStore } from '@/stores/useAppStore';
import type { MonitoringSession } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

export default function MonitoringSessionsPage() {
  const router = useRouter();
  const { currentUser, appUser, loading: authLoading } = useAuth();
  
  const store = useAppStore();
  const monitoringSessions = store.monitoringSessions;
  const sessionsLoading = store.monitoringSessionsLoading;
  const fetchMonitoringSessions = store.fetchMonitoringSessions;

  const currentUserId = useMemo(() => currentUser?.uid || null, [currentUser]);
  const currentPeriod = useMemo(() => appUser?.activePeriod || null, [appUser]);
  const uprDisplayName = useMemo(() => appUser?.displayName || 'UPR...', [appUser]);
  
  useEffect(() => {
    if (currentUserId && currentPeriod && !authLoading) {
      fetchMonitoringSessions(currentUserId, currentPeriod);
    }
  }, [currentUserId, currentPeriod, authLoading, fetchMonitoringSessions]);

  const getStatusBadgeVariant = (status: MonitoringSession['status']) => {
    switch (status) {
      case 'Aktif': return 'default'; // Primary color
      case 'Selesai': return 'secondary'; // Greenish or success
      case 'Dibatalkan': return 'destructive';
      default: return 'outline';
    }
  };

  const isLoadingPage = authLoading || sessionsLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pemantauan & Reviu Risiko"
        description={`Kelola dan lacak sesi pemantauan risiko untuk UPR: ${uprDisplayName}, Periode Aplikasi: ${currentPeriod || '...'}.`}
        actions={
          <Link href="/monitoring/new" passHref>
            <Button disabled={!currentUser || !appUser || isLoadingPage}>
              <PlusCircle className="mr-2 h-4 w-4" /> Mulai Pemantauan Baru
            </Button>
          </Link>
        }
      />

      {isLoadingPage && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Memuat sesi pemantauan...</p>
        </div>
      )}

      {!isLoadingPage && monitoringSessions.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tidak Ada Sesi Pemantauan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Belum ada sesi pemantauan risiko yang dimulai untuk UPR/Periode ini.</p>
            <p className="mt-2">Klik tombol "Mulai Pemantauan Baru" untuk membuat sesi pertama Anda.</p>
          </CardContent>
        </Card>
      )}

      {!isLoadingPage && monitoringSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daftar Sesi Pemantauan ({monitoringSessions.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Nama Periode Pemantauan</TableHead>
                    <TableHead className="min-w-[120px]">Tanggal Mulai</TableHead>
                    <TableHead className="min-w-[120px]">Tanggal Selesai</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="text-right min-w-[150px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monitoringSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium text-sm">{session.name}</TableCell>
                      <TableCell className="text-sm">{format(parseISO(session.startDate), "dd MMM yyyy", { locale: localeID })}</TableCell>
                      <TableCell className="text-sm">{format(parseISO(session.endDate), "dd MMM yyyy", { locale: localeID })}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(session.status)}>{session.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => router.push(`/monitoring/${session.id}/conduct`)} // Nanti akan ke halaman konduksi
                        >
                          {session.status === 'Aktif' ? <PlayCircle className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                          {session.status === 'Aktif' ? 'Lanjutkan' : 'Lihat Detail'}
                        </Button>
                        {/* Tambahkan DropdownMenu untuk opsi lain seperti Edit, Hapus, Selesaikan Sesi */}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
