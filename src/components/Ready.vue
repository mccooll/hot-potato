<template>
  <div class="content" :class="{ hide: hide, emerge: !hide }">
    <h2>Are you ready to sing?</h2>
    <div>
      <button @click="yes"><h2>Yes</h2></button>
    </div>
    <h3 class="title">{{title}}</h3>
  </div>
</template>

<script>
export default {
  data: () => ({
    title: 'Amazing Grace',
    hide: true
  }),
  props: ['readyPromise','soundServices'],
  mounted: function() {
    this.$emit('bubble', 0);
    setTimeout(() => this.hide = false);
  },
  methods: {
    yes: function() {
      this.hide = true;
      setTimeout(() => this.$router.push('5'), 1000);
    }
  }
}
</script>
