<template>
  <div class="content">
    <h3>{{ msg }}</h3>
    <h2>Can you hear anything?</h2>
    <div><button><h2>Yes</h2></button></div>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  props: {
    msg: String
  }
}
</script>

<style scoped>

</style>
