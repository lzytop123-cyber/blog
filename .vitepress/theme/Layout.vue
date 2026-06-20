<script setup>
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import { onMounted, watch, nextTick } from 'vue'

const { Layout } = DefaultTheme
const { page, frontmatter } = useData()

function loadGiscus() {
  const container = document.getElementById('giscus-container')
  if (!container) return
  container.innerHTML = ''
  
  const script = document.createElement('script')
  script.src = 'https://giscus.app/client.js'
  script.setAttribute('data-repo', 'lzytop123-cyber/blog')
  script.setAttribute('data-repo-id', 'R_kgDOTAGdWw')
  script.setAttribute('data-category', 'Announcements')
  script.setAttribute('data-category-id', 'DIC_kwDOTAGdW84C_iFO')
  script.setAttribute('data-mapping', 'pathname')
  script.setAttribute('data-strict', '0')
  script.setAttribute('data-reactions-enabled', '1')
  script.setAttribute('data-emit-metadata', '0')
  script.setAttribute('data-input-position', 'bottom')
  script.setAttribute('data-theme', 'preferred_color_scheme')
  script.setAttribute('data-lang', 'zh-CN')
  script.crossOrigin = 'anonymous'
  script.async = true
  container.appendChild(script)
}

onMounted(() => {
  if (!frontmatter.value.comments) return
  nextTick(loadGiscus)
})

watch(() => page.value.path, () => {
  if (!frontmatter.value.comments) return
  nextTick(loadGiscus)
})
</script>

<template>
  <Layout>
    <template #doc-after>
      <div v-if="frontmatter.comments" class="giscus-wrapper">
        <div id="giscus-container"></div>
      </div>
    </template>
  </Layout>
</template>

<style>
.giscus-wrapper {
  margin-top: 64px;
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 32px;
}
</style>
