<template>
  <div class="relative mb-5 mt-14 first:mt-0">
    <h2 class="landing-h2">
      <slot />
    </h2>
    <div
      aria-hidden="true"
      class="landing-h2 absolute inset-0 blur-xs animate-pulse pointer-events-none select-none"
    >
      <slot />
    </div>
  </div>
</template>
