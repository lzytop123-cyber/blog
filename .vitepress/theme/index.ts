import DefaultTheme from 'vitepress/theme'
import GiscusComments from './GiscusComments.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('GiscusComments', GiscusComments)
  }
}
