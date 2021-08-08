<template>
  <div class="status-icon">
      <span style="width: 48px; height: 48px; " class="build-status-icon__wrapper">
    <span class="build-status-icon__outer">
      <svg viewBox="0 0 24 24" focusable="false" :class="anime ? 'svg-icon icon-anime ' + color: 'svg-icon ' + color">
        <use :xlink:href="anime ? '#status_build-status-in-progress' : '#status_build-status-static'"></use>
      </svg>
    </span>
    <svg viewBox="0 0 24 24" focusable="false" :class="'svg-icon ' + color">
      <use :xlink:href="'#status_' + name"></use>
    </svg>
  </span>
  </div>
</template>

<script>

import '../assets/svg/status.svg'
export default {
  name: "StatusIcon",
  props: {
    name: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    anime: {
      type: Boolean,
      required: false,
      default: true
    }
  },
  computed: {
  }
}
</script>

<style scoped>
  .status-icon {
    vertical-align: middle;
  }
  .build-status-icon__wrapper {
      display: inline-block;
      position: relative;
  }

  .build-status-icon__outer {
    display: block;
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    transform: translate(-50%, -50%);

  }
  .svg-icon {
    display: inline-block;
    vertical-align: middle;
    height: 100%;
    width: 100%;
    fill: #333;
  }

  .icon-anime {
    -webkit-animation: spin-reverse 2s linear infinite;
    animation: spin-reverse 2s linear infinite;
    will-change: transform;
  }

  .icon-nobuilt{
    color: #0b6aa2;
    fill: #0b6aa2;
  }

  .icon-disabled{
    color: #333;
    fill: #333;
    opacity: 0.5;
  }

  .icon-aborted{
    color: #333;
    fill: #333;
  }

  .icon-blue{
    color: #138347;
    fill: #138347;
  }

  .icon-yellow{
    color: #ff9800;
    fill: #ff9800;
  }

  .icon-red{
    color: #cc0003;
    fill: #cc0003;
  }

  @-webkit-keyframes spin-reverse {
    from {
      transform: rotate(360deg);
    }
    to {
      transform: rotate(0deg);
    }
  }
  @keyframes spin-reverse {
    from {
      transform: rotate(360deg);
    }
    to {
      transform: rotate(0deg);
    }
  }
</style>
