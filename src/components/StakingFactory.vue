<template>
    <div>
        <faucet></faucet>
        <div v-if="page === 0">
            <staking></staking>
        </div>
        <div v-else-if="page === 1">
            <admin></admin>
        </div>
    </div>
</template>

<script>
import Web3 from "web3"
import {mapMutations, mapState} from "vuex"
import StakerFactory from "../../build/contracts-final/StakerFactory.json"
import Faucet from './Faucet.vue'
import Admin from './Admin.vue'
import Staking from './Staking.vue'

export default {
    components: { Faucet, Admin, Staking },
    name: "StakingFactory",
    async created() {
        const loader = this.$loading.show({loader: 'bars'})
        //init web3
        if (window.ethereum) {
            window.web3 = new Web3(window.ethereum)
            await window.ethereum.enable()
        }
        else if (window.web3) {
            window.web3 = new Web3(window.web3.currentProvider)
        }
        else {
            window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
        }

        //get accounts
        const accounts = await web3.eth.getAccounts()
        const walletAddress = accounts[0]

        this.setAddress(walletAddress)

        //get network id
        const nid = await web3.eth.net.getId()
        console.log("Network ID is", nid)

        const std = StakerFactory.networks[nid]
        if (std) {
            this.setStakerFactoryContract(new web3.eth.Contract(StakerFactory.abi, std.address))
        } else {
            loader.hide()
            return
        }

        //find out if they are the owner?
        const owner = await this.stakerFactoryContract.methods.owner().call({from: this.walletAddress})
        console.log(owner, walletAddress)
        if (owner.toString() === walletAddress.toString()) {
            this.setUserType('owner')
        } else {
            this.setUserType("user")
        }
        loader.hide()
        this.setContractLoaded(true)
    },
    computed: {
        ...mapState(['walletAddress', 'userType', 'page', 'stakerFactoryContract'])
    },
    methods: {
        ...mapMutations(['setAddress', 'setUserType', 'setStakerFactoryContract', 'setContractLoaded']),
    }
}
</script>

<style>

</style>