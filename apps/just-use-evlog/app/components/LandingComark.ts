import { defineComarkRendererComponent } from '@comark/vue'
import LandingCtas from './LandingCtas.vue'
import LandingH1 from './LandingH1.vue'
import LandingH2 from './LandingH2.vue'

export default defineComarkRendererComponent({
  name: 'LandingComark',
  components: {
    'h1': LandingH1,
    'h2': LandingH2,
    'landing-ctas': LandingCtas,
  },
  class: 'landing-prose *:first:mt-0 *:last:mb-0',
})
