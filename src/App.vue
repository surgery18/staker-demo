<template>
    <div id="app" class="container py-4">
        <navbar></navbar>
        <staking-factory></staking-factory>
    </div>
</template>

<script>
import Navbar from './components/Navbar.vue'
import StakingFactory from './components/StakingFactory.vue'
export default {
    name: "App",
    components: {Navbar, StakingFactory}
}
</script>

<style>

</style>