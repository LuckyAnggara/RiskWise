// src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import router from './router'; // Impor router
import pinia from './stores'; // Impor instance Pinia
import './style.css'; 
import 'vue-sonner/style.css'// Pastikan CSS utama diimpor

const app = createApp(App);

app.use(router); // Gunakan router
app.use(pinia);  // Gunakan Pinia

app.mount('#app');