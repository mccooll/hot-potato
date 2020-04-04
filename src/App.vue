<template>
  <div id="app">
    <div class="bigBubble" :class="{slowBubble: speed===1, fastBubble: speed===2}"></div>
    <div class="mediumBubble" :class="{slowBubble: speed===1, fastBubble: speed===2}"></div>
    <div class="smallBubble" :class="{slowBubble: speed===1, fastBubble: speed===2}"></div>
    <router-view @bubble="switchBubbles"></router-view>
  </div>
</template>

<script>

export default {
  name: 'App',
  components: {
  },
  data: () => ({
    speed: 0
  }),
  created: function() {
    this.$router.push("/");
  },
  methods: {
    switchBubbles: function(speed) { this.speed = speed }
  }
}
</script>

<style>
  body {
    background-color: lightcoral;
    overflow-x: hidden;
    overflow-y: hidden;
    color: darkslategrey;
    margin: 0;
    text-align: center;
  }
  .content {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    min-height:100vh;
  }
  .bigBubble {
    background-color: lightpink;
    position:absolute;
    top:-100vh;
    left:-50vh;
    width: 200vh;
    height: 200vh;
    border-radius:100vh;
    z-index: -5;
  }
  .mediumBubble {
    background-color: lightgrey;
    position:absolute;
    top:-100vh;
    left:-18.75vh;
    width: 150vh;
    height: 150vh;
    border-radius:75vh;
    z-index: -4;
  }
  .smallBubble {
    background-color: lightblue;
    position:absolute;
    top:-50vh;
    left:20vh;
    width: 60vh;
    height: 60vh;
    border-radius:30vh;
    z-index: -3;
  }
  .slowBubble {
    animation-name:bubbling;
    animation-duration: 20s;
    animation-iteration-count: infinite;
  }
  .fastBubble {
    animation-name:bubbling;
    animation-duration: 10s;
    animation-iteration-count: infinite;
  }
  @keyframes bubbling {
    from {
      transform: scale(1);
      animation-timing-function: ease-out;
    }
    50% {
      transform: scale(1.10);
      animation-timing-function: ease-in;
    }
    to {
      transform: scale(1);
    }
  }
  h1 {
    font-size: 30vw;
    font-size: min(90vw, 90vh);
    margin: 0;
  }
  h2 {
    font-size: 10vw;
    font-size: min(10vw,10vh);
    margin: 0;
    text-transform: uppercase;
  }
  h3 {
    font-size: 5vw;
    font-size: min(5vw,5vh);
    margin: 0;
  }
  .hide {
    transition:all 1s;
    filter: blur(5px);
    opacity: 0;
  }
  .emerge {
    transition:all 1s;
    filter: blur(0px);
    opacity: 1;
  }
  button {
    border-radius:1vw;
    padding:1vw;
    background: rgba(255,255,255,0.5);
    color: darkslategrey;
  }
</style>
