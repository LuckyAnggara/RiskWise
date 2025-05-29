<template>
    <header class="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:px-6">
      <div class="flex items-center gap-2">
        <div v-if="authStore.appUser" class="text-sm text-muted-foreground">
          <span class="font-semibold">UPR:</span> {{ authStore.appUser.display_name || '...' }} |
          <span class="font-semibold">Periode:</span> {{ authStore.appUser.active_period || '...' }}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <DropdownMenu v-if="authStore.currentUser">
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon" class="rounded-full">
              <Avatar class="h-8 w-8">
                <AvatarFallback>{{ (authStore.appUser?.display_name || authStore.currentUser?.email || "RW").substring(0, 2).toUpperCase() }}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{{ authStore.appUser?.display_name || authStore.currentUser?.email }}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem as-child>
              <router-link to="/settings">
                <span>Pengaturan</span>
              </router-link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem @click="handleLogout">
              <span>Keluar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  </template>
  
  <script setup>
  import { useRouter } from 'vue-router';
  import { Button } from '@/components/ui/button';
  import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
  // Impor ikon lucide-vue-next jika diperlukan
  import { useAuthStore } from '@/stores/authStore';
  import { toast } from 'vue-sonner'; // Sesuaikan path jika berbeda
  
  const authStore = useAuthStore();
  const router = useRouter();
  // const { toast } = useToast(); // Jika Anda mengadaptasi useToast dari Shadcn/Vue
  
  const handleLogout = async () => {
    try {
      await authStore.signOut();
      toast({ title: 'Keluar Berhasil', description: 'Anda telah berhasil keluar.' });
      router.push('/login');
    } catch (error) {
      console.error("Error logging out:", error);
      toast({ title: 'Gagal Keluar', description: 'Terjadi kesalahan saat keluar.', variant: 'destructive' });
    }
  };
  </script>