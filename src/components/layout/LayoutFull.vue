<template>
    <div class="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <router-view />
      <Toaster />
    </div>
</template>
  
  <script setup>
    import { Toaster } from '@/components/ui/sonner' // Sesuaikan path jika diperlukan
  </script>