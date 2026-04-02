<template>
  <div class="relative mb-4">
    <h1 class="landing-h1">
      <slot />
    </h1>
    <div
      aria-hidden="true"
      class="landing-h1 absolute inset-0 blur-xs animate-pulse pointer-events-none select-none"
    >
      <slot />
    </div>
  </div>
</template>
