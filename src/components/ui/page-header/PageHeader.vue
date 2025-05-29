<template>
    <div :class="cn('mb-6 md:mb-8', $attrs.class)">
      <div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 class="text-xl font-bold tracking-tight md:text-2xl">{{ title }}</h1>
          <p v-if="description" class="mt-1 text-sm text-muted-foreground">{{ description }}</p>
        </div>
        <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2">
          <slot name="actions"></slot>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { cn } from '@/lib/utils'; // Asumsi Anda sudah membuat adaptasi fungsi cn
  
  defineProps({
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
  });
  
  // $attrs akan menangkap atribut non-prop seperti `class`
  // $slots.actions digunakan untuk mengecek apakah slot 'actions' diisi
  </script>