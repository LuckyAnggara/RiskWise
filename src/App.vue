<script setup>
    import { onMounted } from 'vue';
    import { useAuthStore } from '@/stores/authStore';
    import { Toaster } from 'vue-sonner';

    const authStore = useAuthStore();

    onMounted(async () => {
      await authStore.initializeAuthListener(); // Panggil dan tunggu
      console.log("[App.vue] Auth listener initialization process started/completed.");
    });
    </script>
    <template>
      <router-view />
      <Toaster richColors position="top-right" />
    </template>